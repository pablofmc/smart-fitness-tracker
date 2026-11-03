import "server-only";
import { gunzipSync } from "node:zlib";
import { readAll } from "@/lib/activities/store";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { HEALTH_KINDS, HEALTH_PARSER_VERSION, splitHealthPayload } from "./parse";

const BATCH_SIZE = 20;

/** Same contract as parsePendingActivities: resumable within a budget, and the reprocess job too. */
export async function parsePendingHealth(budgetMs: number) {
  const db = createAdminClient();
  const deadline = Date.now() + budgetMs;

  const [files, parsed] = await Promise.all([
    readAll((from, to) => db.from("raw_files").select("id, kind, source_key, storage_path, sha256").in("kind", HEALTH_KINDS).order("id").range(from, to)),
    readAll((from, to) => db.from("health_parsed_files").select("raw_file_id, raw_sha256, parser_version").order("raw_file_id").range(from, to)),
  ]);
  const current = new Set(parsed.filter((row) => row.parser_version === HEALTH_PARSER_VERSION).map((row) => `${row.raw_file_id}:${row.raw_sha256}`));
  const pending = files.filter((file) => !current.has(`${file.id}:${file.sha256}`));

  let done = 0;
  for (let index = 0; index < pending.length && Date.now() < deadline; index += BATCH_SIZE) {
    const batch = pending.slice(index, index + BATCH_SIZE);
    const rows = (
      await Promise.all(
        batch.map(async (file) => {
          const { data, error } = await db.storage.from("raw").download(file.storage_path);
          if (error) throw new Error(`Downloading ${file.storage_path}: ${error.message}`);
          const payload = JSON.parse(gunzipSync(Buffer.from(await data.arrayBuffer())).toString());
          return splitHealthPayload(file.kind, file.source_key, payload).map(({ day, data: dayData }) => ({
            kind: file.kind,
            day,
            raw_file_id: file.id,
            raw_sha256: file.sha256,
            parser_version: HEALTH_PARSER_VERSION,
            data: dayData as { [key: string]: Json },
          }));
        }),
      )
    ).flat();
    if (rows.length) {
      const { error } = await db.from("health_days").upsert(rows);
      if (error) throw new Error(`Saving health days: ${error.message}`);
    }
    const { error } = await db
      .from("health_parsed_files")
      .upsert(batch.map((file) => ({ raw_file_id: file.id, raw_sha256: file.sha256, parser_version: HEALTH_PARSER_VERSION })));
    if (error) throw new Error(`Recording parsed files: ${error.message}`);
    done += batch.length;
  }
  return { done, pending: pending.length - done };
}
