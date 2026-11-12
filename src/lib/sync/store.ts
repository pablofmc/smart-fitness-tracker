import "server-only";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ArchiveItem, SyncStore } from "./run";

const BUCKET = "raw";

/**
 * JSON is gzipped to save quota (ADR-0003). A .FIT arrives zipped already, so it's stored as sent.
 * New files go under the person's folder (ADR-0007).
 */
function encodeForStorage(userId: string, { kind, sourceKey, bytes, format }: ArchiveItem) {
  return format === "zip"
    ? { path: `${userId}/${kind}/${sourceKey}.zip`, body: bytes, contentType: "application/zip" }
    : { path: `${userId}/${kind}/${sourceKey}.json.gz`, body: gzipSync(bytes), contentType: "application/gzip" };
}

/** One person's cursors and raw archive. Every read and write is filtered by `userId` (ADR-0007). */
export function createSyncStore(userId: string): SyncStore {
  const db = createAdminClient();

  return {
    async getCursor(stream) {
      const { data, error } = await db
        .from("sync_cursors")
        .select("position, backfill_completed_at, updated_at")
        .eq("user_id", userId)
        .eq("stream", stream)
        .maybeSingle();
      if (error) throw new Error(`Reading cursor ${stream}: ${error.message}`);
      return data && { position: data.position, completed: data.backfill_completed_at !== null, updatedAt: data.updated_at };
    },

    async saveCursor(stream, position, completed) {
      const now = new Date().toISOString();
      const { error } = await db
        .from("sync_cursors")
        .upsert({ user_id: userId, stream, position, backfill_completed_at: completed ? now : null, updated_at: now });
      if (error) throw new Error(`Saving cursor ${stream}: ${error.message}`);
    },

    async hasRaw(kind, sourceKey) {
      const { count, error } = await db
        .from("raw_files")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("source_key", sourceKey);
      if (error) throw new Error(`Looking up ${kind}: ${error.message}`);
      return (count ?? 0) > 0;
    },

    async archive(item) {
      const sha256 = createHash("sha256").update(item.bytes).digest("hex");
      const { data: existing, error: lookupError } = await db
        .from("raw_files")
        .select("sha256, storage_path")
        .eq("user_id", userId)
        .eq("kind", item.kind)
        .eq("source_key", item.sourceKey)
        .maybeSingle();
      if (lookupError) throw new Error(`Looking up ${item.kind}: ${lookupError.message}`);
      if (existing?.sha256 === sha256) return false;

      const encoded = encodeForStorage(userId, item);
      const { body, contentType } = encoded;
      // A changed payload overwrites its file in place, so files archived before ADR-0007 keep their path.
      const path = existing?.storage_path ?? encoded.path;
      const upload = await db.storage.from(BUCKET).upload(path, body, { contentType, upsert: true });
      if (upload.error) throw new Error(`Uploading ${path}: ${upload.error.message}`);

      const { error } = await db.from("raw_files").upsert(
        {
          user_id: userId,
          kind: item.kind,
          source_key: item.sourceKey,
          storage_path: path,
          content_type: contentType,
          size_bytes: body.byteLength,
          sha256,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "user_id,kind,source_key" },
      );
      if (error) throw new Error(`Recording ${path}: ${error.message}`);
      return true;
    },
  };
}
