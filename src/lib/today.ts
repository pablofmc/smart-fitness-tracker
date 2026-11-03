import "server-only";
import { gunzipSync } from "node:zlib";
import { createClient } from "@/lib/supabase/server";

/**
 * Today's calendar day in the time zone set on the owner's Garmin profile, so "today" matches the days
 * Garmin assigns (R-DAT-04). Falls back to UTC when the profile isn't archived yet.
 */
export async function ownerToday(now = new Date()) {
  const db = await createClient();
  const { data: file } = await db.from("raw_files").select("storage_path").eq("kind", "profile_settings").maybeSingle();
  let timeZone = "UTC";
  if (file) {
    const { data } = await db.storage.from("raw").download(file.storage_path);
    if (data) {
      try {
        const zone = JSON.parse(gunzipSync(Buffer.from(await data.arrayBuffer())).toString()).timeZone;
        if (typeof zone === "string") {
          new Intl.DateTimeFormat("en", { timeZone: zone });
          timeZone = zone;
        }
      } catch {
        timeZone = "UTC";
      }
    }
  }
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
