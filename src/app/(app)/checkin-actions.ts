"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUserId } from "@/lib/supabase/auth";

const checkin = z.object({
  day: z.iso.date(),
  feel: z.number().int().min(1).max(5).nullable(),
  tags: z.array(z.string().min(1).max(40)).max(20),
  weightKg: z.number().min(20).max(300).nullable(),
  note: z.string().max(500).nullable(),
});

/** Saves the whole check-in for one day; every tap calls it, so it's an upsert. */
export async function saveCheckin(input: z.input<typeof checkin>) {
  const userId = await requireUserId();
  const parsed = checkin.safeParse(input);
  if (!parsed.success) return { message: "No pudimos guardar el check-in." };
  const { day, feel, tags, weightKg, note } = parsed.data;
  const { error } = await createAdminClient()
    .from("checkins")
    .upsert({ user_id: userId, day, feel, tags, weight_kg: weightKg, note: note?.trim() || null, updated_at: new Date().toISOString() });
  if (error) return { message: "No pudimos guardar el check-in." };
  revalidatePath("/");
  return {};
}

const tagName = z.string().trim().min(1).max(40);

export async function addCheckinTag(name: string) {
  const userId = await requireUserId();
  const parsed = tagName.safeParse(name);
  if (!parsed.success) return { message: "Escribe un nombre de hasta 40 letras." };
  const { error } = await createAdminClient().from("checkin_tags").upsert({ user_id: userId, name: parsed.data });
  if (error) return { message: "No pudimos guardar la etiqueta." };
  revalidatePath("/", "layout");
  return {};
}

export async function removeCheckinTag(name: string) {
  const userId = await requireUserId();
  const { error } = await createAdminClient().from("checkin_tags").delete().eq("user_id", userId).eq("name", name);
  if (error) return { message: "No pudimos quitar la etiqueta." };
  revalidatePath("/", "layout");
  return {};
}
