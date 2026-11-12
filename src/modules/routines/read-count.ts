import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ownerTimeZone, ownerToday } from "@/lib/today";
import { readsSince, readsThisMonth } from "./read-cap";

/** The signed-in person's AI reads this calendar month, in their time zone (R-USR-04). Reads through RLS. */
export async function aiReadsThisMonth() {
  const db = await createClient();
  const [today, timeZone] = await Promise.all([ownerToday(), ownerTimeZone()]);
  const { data, error } = await db.from("routine_reads").select("created_at").gte("created_at", readsSince(today));
  if (error) throw new Error("No pudimos contar las lecturas de este mes.");
  return { used: readsThisMonth((data ?? []).map((r) => r.created_at), today, timeZone), today };
}
