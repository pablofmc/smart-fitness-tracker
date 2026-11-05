"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/supabase/auth";

export type SaveHrState = { message?: string; saved?: boolean };

const input = z
  .object({
    maxHr: z.coerce.number().int().min(100).max(240),
    restingHr: z.coerce.number().int().min(25).max(120),
    lthr: z.coerce.number().int().min(80).max(230),
    today: z.iso.date(),
  })
  .refine((v) => v.maxHr > v.restingHr && v.lthr <= v.maxHr);

/**
 * Adds a version effective from today (the browser's day), so past activities keep theirs (R-LOAD-05).
 * Saving twice on one day replaces that day's version, which no activity can have used yet for long.
 */
export async function saveHrSettings(_prev: SaveHrState, formData: FormData): Promise<SaveHrState> {
  await requireSession();
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Revisa los valores: la máxima debe superar la de reposo y el umbral no puede pasarla." };
  const { maxHr, restingHr, lthr, today } = parsed.data;

  const { error } = await createAdminClient()
    .from("hr_settings")
    .upsert({ effective_from: today, max_hr: maxHr, resting_hr: restingHr, lthr, source: "owner" }, { onConflict: "effective_from" });
  if (error) return { message: "No pudimos guardar. Intenta de nuevo." };
  revalidatePath("/", "layout");
  return { saved: true };
}
