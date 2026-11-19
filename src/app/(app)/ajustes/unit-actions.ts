"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUserId } from "@/lib/supabase/auth";
import { WEIGHT_UNITS, type WeightUnit } from "@/lib/units";

/** Saves the person's weight unit (#66). Only what's shown changes: weights stay stored in kg. */
export async function saveWeightUnit(unit: WeightUnit) {
  const userId = await requireUserId();
  if (!WEIGHT_UNITS.includes(unit)) return { message: "Elige kg o lb." };
  const { error } = await createAdminClient().from("user_settings").upsert({ user_id: userId, weight_unit: unit, updated_at: new Date().toISOString() });
  if (error) return { message: "No pudimos guardar la unidad. Intenta de nuevo." };
  revalidatePath("/", "layout");
  return {};
}
