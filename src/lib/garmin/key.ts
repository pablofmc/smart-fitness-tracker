import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUserId } from "@/lib/supabase/auth";
import type { SyncCandidate } from "@/lib/sync/turn";
import { keyStatus, type KeyStatus } from "./key-status";

/** Reads only the signed-in person's key metadata: the key itself never leaves `readUsableGarminKey`. */
export async function getGarminKeyStatus(): Promise<KeyStatus> {
  const userId = await requireUserId();
  const { data, error } = await createAdminClient()
    .from("garmin_key")
    .select("expires_on, blocked_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("No pudimos leer el estado de la clave.");
  const today = new Date().toISOString().slice(0, 10);
  return keyStatus(data && { expiresOn: data.expires_on, blockedAt: data.blocked_at }, today);
}

/** Saves the signed-in person's key. A new key clears the block, so their next sync run resumes (R-SYN-05). */
export async function saveGarminKey(apiKey: string, expiresOn: string) {
  const userId = await requireUserId();
  const { error } = await createAdminClient().from("garmin_key").upsert({
    user_id: userId,
    api_key: apiKey,
    expires_on: expiresOn,
    blocked_at: null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("No pudimos guardar la clave.");
}

/**
 * For the sync run only, and its callers must have checked who's asking. Null when that person has no
 * key, or when Garmin already rejected it, so a blocked sync stops calling Garmin.
 */
export async function readUsableGarminKey(userId: string) {
  const { data, error } = await createAdminClient().from("garmin_key").select("api_key, blocked_at").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("No pudimos leer la clave.");
  return data && !data.blocked_at ? data.api_key : null;
}

export async function markGarminKeyBlocked(userId: string) {
  const { error } = await createAdminClient()
    .from("garmin_key")
    .update({ blocked_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error("No pudimos marcar la clave como rechazada.");
}

/** Everyone a scheduled run could sync: a key Garmin hasn't rejected, and when their last run started. */
export async function syncCandidates(): Promise<SyncCandidate[]> {
  const db = createAdminClient();
  const { data: keys, error } = await db.from("garmin_key").select("user_id").is("blocked_at", null);
  if (error) throw new Error("No pudimos leer las claves.");
  return Promise.all(
    (keys ?? []).map(async ({ user_id }) => {
      const { data: last } = await db.from("sync_runs").select("started_at").eq("user_id", user_id).order("started_at", { ascending: false }).limit(1).maybeSingle();
      return { userId: user_id, lastStartedAt: last?.started_at ?? null };
    }),
  );
}
