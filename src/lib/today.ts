import "server-only";
import { gunzipSync } from "node:zlib";
import { createClient } from "@/lib/supabase/server";

/** The time zone on the owner's Garmin profile, or UTC when the profile isn't archived yet. */
export async function ownerTimeZone() {
  const db = await createClient();
  const { data: file } = await db.from("raw_files").select("storage_path").eq("kind", "profile_settings").maybeSingle();
  if (!file) return "UTC";
  const { data } = await db.storage.from("raw").download(file.storage_path);
  if (!data) return "UTC";
  try {
    const zone = JSON.parse(gunzipSync(Buffer.from(await data.arrayBuffer())).toString()).timeZone;
    if (typeof zone !== "string") return "UTC";
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}

/**
 * Today's calendar day in the time zone set on the owner's Garmin profile, so "today" matches the days
 * Garmin assigns (R-DAT-04).
 */
export async function ownerToday(now = new Date()) {
  const timeZone = await ownerTimeZone();
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
