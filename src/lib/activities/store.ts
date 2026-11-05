import "server-only";
import { gunzipSync } from "node:zlib";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { ACTIVITY_PARSER_VERSION, parseActivitySummary } from "./parse";

const PAGE_SIZE = 1000;
const BATCH_SIZE = 20;

type Db = ReturnType<typeof createAdminClient>;

/** Reads every row, past the Data API's 1,000-row limit. */
export async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

async function parseFile(db: Db, file: { id: number; storage_path: string; sha256: string }) {
  const { data, error } = await db.storage.from("raw").download(file.storage_path);
  if (error) throw new Error(`Downloading ${file.storage_path}: ${error.message}`);
  const parsed = parseActivitySummary(JSON.parse(gunzipSync(Buffer.from(await data.arrayBuffer())).toString()));
  return parsed && { ...parsed, raw_file_id: file.id, raw_sha256: file.sha256, parser_version: ACTIVITY_PARSER_VERSION };
}

/**
 * Parses summaries that are new, changed in Garmin or read by an older parser, until the budget runs out.
 * The next sync carries on, so this also is the reprocess job: emptying the table rebuilds it (R-DAT-02).
 */
export async function parsePendingActivities(budgetMs: number) {
  const db = createAdminClient();
  const deadline = Date.now() + budgetMs;

  const [files, parsed] = await Promise.all([
    readAll((from, to) => db.from("raw_files").select("id, storage_path, sha256").eq("kind", "activity_summary").order("id").range(from, to)),
    readAll((from, to) => db.from("activities").select("raw_file_id, raw_sha256, parser_version").order("id").range(from, to)),
  ]);
  const current = new Set(parsed.filter((row) => row.parser_version === ACTIVITY_PARSER_VERSION).map((row) => `${row.raw_file_id}:${row.raw_sha256}`));
  const pending = files.filter((file) => !current.has(`${file.id}:${file.sha256}`));

  let done = 0;
  for (let index = 0; index < pending.length && Date.now() < deadline; index += BATCH_SIZE) {
    const batch = await Promise.all(pending.slice(index, index + BATCH_SIZE).map((file) => parseFile(db, file)));
    const rows = batch.filter((row) => row !== null);
    if (rows.length) {
      const { error } = await db.from("activities").upsert(rows.map((row) => ({ ...row, data: row.data as { [key: string]: Json } })));
      if (error) throw new Error(`Saving activities: ${error.message}`);
    }
    done += batch.length;
  }
  return { done, pending: pending.length - done };
}
