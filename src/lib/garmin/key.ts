import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/supabase/auth";
import { keyStatus, type KeyStatus } from "./key-status";

/** Reads only the key's metadata: the key itself never leaves `readUsableGarminKey`. */
export async function getGarminKeyStatus(): Promise<KeyStatus> {
  await requireSession();
  const { data, error } = await createAdminClient()
    .from("garmin_key")
    .select("expires_on, blocked_at")
    .maybeSingle();
  if (error) throw new Error("No pudimos leer el estado de la clave.");
  const today = new Date().toISOString().slice(0, 10);
  return keyStatus(data && { expiresOn: data.expires_on, blockedAt: data.blocked_at }, today);
}

/** Saving a new key clears the block, so the next sync run resumes (R-SYN-05). */
export async function saveGarminKey(apiKey: string, expiresOn: string) {
  await requireSession();
  const { error } = await createAdminClient().from("garmin_key").upsert({
    id: true,
    api_key: apiKey,
    expires_on: expiresOn,
    blocked_at: null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("No pudimos guardar la clave.");
}

/**
 * For the sync run only, and its callers must have checked who's asking. Null when there's no key,
 * or when Garmin already rejected it, so a blocked sync stops calling Garmin.
 */
export async function readUsableGarminKey() {
  const { data, error } = await createAdminClient().from("garmin_key").select("api_key, blocked_at").maybeSingle();
  if (error) throw new Error("No pudimos leer la clave.");
  return data && !data.blocked_at ? data.api_key : null;
}

export async function markGarminKeyBlocked() {
  const { error } = await createAdminClient()
    .from("garmin_key")
    .update({ blocked_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error("No pudimos marcar la clave como rechazada.");
}
