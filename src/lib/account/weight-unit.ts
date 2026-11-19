import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseUnit, type WeightUnit } from "@/lib/units";

/** The signed-in person's weight unit (#66); kg until they choose. Read once per request, through RLS. */
export const readWeightUnit = cache(async (): Promise<WeightUnit> => {
  const db = await createClient();
  const { data } = await db.from("user_settings").select("weight_unit").maybeSingle();
  return parseUnit(data?.weight_unit);
});
