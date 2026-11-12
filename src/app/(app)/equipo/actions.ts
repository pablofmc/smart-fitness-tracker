"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { RUN_TYPES, shoeName } from "@/modules/gear/catalog";
import { SHOE_CATALOG } from "@/modules/gear/catalog-data";
import { RUN_SPORTS } from "@/lib/load/running";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUserId } from "@/lib/supabase/auth";
import { addDays } from "@/lib/sync/streams";
import { ownerToday } from "@/lib/today";

const PHOTO_BUCKET = "gear-photos";
const PHOTO_MAX_BYTES = 300 * 1024;
const PHOTO_TYPES = { "image/webp": "webp", "image/jpeg": "jpg" } as const;

export type AddShoeState = { message?: string };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const common = z.object({
  startedOn: z.iso.date(),
  initialKm: z.coerce.number().min(0).max(99999),
  limitKm: z.coerce.number().positive().max(99999),
  isDefault: z.literal("on").optional(),
});

const shoeInput = z.discriminatedUnion("source", [
  common.extend({ source: z.literal("catalog"), catalogName: z.string().min(1) }),
  common.extend({
    source: z.literal("manual"),
    brand: z.string().trim().min(1).max(40),
    model: z.string().trim().min(1).max(60),
    version: optionalText(20),
    runTypes: z.array(z.enum(RUN_TYPES)).min(1).max(2),
  }),
]);

/** Registers a shoe from the catalog or typed by hand, with an optional photo (R-GEAR-01, R-GEAR-02). */
export async function addShoe(_prev: AddShoeState, form: FormData): Promise<AddShoeState> {
  const userId = await requireUserId();
  const parsed = shoeInput.safeParse({ ...Object.fromEntries(form), runTypes: form.getAll("runTypes") });
  if (!parsed.success) return { message: "Revisa el modelo, los km y la fecha." };
  const input = parsed.data;

  let model: { brand: string; model: string; version: string | null; run_types: string[]; catalog_image: string | null };
  if (input.source === "catalog") {
    const entry = SHOE_CATALOG.find((s) => shoeName(s) === input.catalogName);
    if (!entry) return { message: "Ese modelo ya no está en el catálogo. Búscalo otra vez." };
    model = { brand: entry.brand, model: entry.model, version: entry.version, run_types: entry.runTypes, catalog_image: entry.image };
  } else {
    // A hand-typed model that matches a catalog entry gets its image too.
    const entry = SHOE_CATALOG.find((s) => shoeName(s).toLowerCase() === shoeName(input).toLowerCase());
    model = { brand: input.brand, model: input.model, version: input.version, run_types: input.runTypes, catalog_image: entry?.image ?? null };
  }

  const photo = form.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (hasPhoto && (photo.size > PHOTO_MAX_BYTES || !(photo.type in PHOTO_TYPES))) {
    return { message: "La foto no se pudo achicar lo suficiente. Prueba con otra." };
  }

  const db = createAdminClient();
  let photoPath: string | null = null;
  if (hasPhoto) {
    photoPath = `${userId}/${crypto.randomUUID()}.${PHOTO_TYPES[photo.type as keyof typeof PHOTO_TYPES]}`;
    const { error } = await db.storage.from(PHOTO_BUCKET).upload(photoPath, photo, { contentType: photo.type });
    if (error) return { message: "No pudimos subir la foto." };
  }

  if (input.isDefault) {
    const { error } = await db.from("shoes").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
    if (error) return { message: "No pudimos guardar la zapatilla." };
  }
  const { error } = await db.from("shoes").insert({
    ...model,
    user_id: userId,
    photo_path: photoPath,
    started_on: input.startedOn,
    initial_km: input.initialKm,
    limit_km: input.limitKm,
    is_default: Boolean(input.isDefault),
  });
  if (error) {
    if (photoPath) await db.storage.from(PHOTO_BUCKET).remove([photoPath]);
    return { message: "No pudimos guardar la zapatilla." };
  }

  if (input.source === "manual" && !model.catalog_image) {
    // Kept in my own list so later searches offer it (R-GEAR-01). A repeat hits the unique
    // index and is ignored: the shoe itself is already saved.
    await db.from("shoe_models").insert({ user_id: userId, brand: model.brand, model: model.model, version: model.version, run_types: model.run_types });
  }

  revalidatePath("/equipo");
  redirect("/equipo");
}

const runShoe = z.object({ activityId: z.number().int().positive(), shoeId: z.number().int().positive().nullable() });

/** Moves a run to another shoe, or to none, from the run detail (R-GEAR-03). Its km move with it. */
export async function setRunShoe(input: z.input<typeof runShoe>): Promise<{ message?: string }> {
  const userId = await requireUserId();
  const parsed = runShoe.safeParse(input);
  if (!parsed.success) return { message: "No pudimos cambiar la zapatilla." };
  const { activityId, shoeId } = parsed.data;
  const db = createAdminClient();

  const [{ data: run }, { data: shoe }] = await Promise.all([
    db.from("activities").select("id").eq("user_id", userId).eq("id", activityId).in("sport", RUN_SPORTS).maybeSingle(),
    shoeId === null ? Promise.resolve({ data: null }) : db.from("shoes").select("id, retired_on").eq("user_id", userId).eq("id", shoeId).maybeSingle(),
  ]);
  if (!run) return { message: "Esa carrera no existe." };
  if (shoeId !== null && (!shoe || shoe.retired_on)) return { message: "Esa zapatilla está retirada o ya no existe." };

  const { error } = await db
    .from("shoe_runs")
    .upsert({ user_id: userId, activity_id: activityId, shoe_id: shoeId, source: "manual", updated_at: new Date().toISOString() });
  if (error) return { message: "No pudimos cambiar la zapatilla." };
  revalidatePath(`/actividades/${activityId}`);
  revalidatePath("/equipo");
  return {};
}

const shoeId = z.number().int().positive();

/** One of this person's shoes, if it exists and isn't retired. Another person's id reads as missing. */
async function activeShoe(userId: string, id: number) {
  const { data } = await createAdminClient().from("shoes").select("id, retired_on").eq("user_id", userId).eq("id", id).maybeSingle();
  return data && !data.retired_on ? data : null;
}

/** New runs from sync go to this shoe from now on (R-GEAR-03). */
export async function makeDefaultShoe(id: number): Promise<{ message?: string }> {
  const userId = await requireUserId();
  if (!shoeId.safeParse(id).success || !(await activeShoe(userId, id))) return { message: "Esa zapatilla está retirada o ya no existe." };
  const db = createAdminClient();
  const cleared = await db.from("shoes").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
  const { error } = cleared.error ? cleared : await db.from("shoes").update({ is_default: true }).eq("user_id", userId).eq("id", id);
  if (error) return { message: "No pudimos cambiar la predeterminada." };
  revalidatePath("/equipo");
  return {};
}

/** Moves a shoe to the history with its final km; it takes no new runs (R-GEAR-04). */
export async function retireShoe(id: number): Promise<{ message?: string }> {
  const userId = await requireUserId();
  if (!shoeId.safeParse(id).success || !(await activeShoe(userId, id))) return { message: "Esa zapatilla ya está retirada o no existe." };
  const { error } = await createAdminClient()
    .from("shoes")
    .update({ retired_on: await ownerToday(), is_default: false })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) return { message: "No pudimos retirar la zapatilla." };
  revalidatePath("/equipo");
  revalidatePath("/");
  return {};
}

/** "Ocultar 7 días": Hoy stops showing this shoe's warning for a week; Equipo keeps it. */
export async function hideShoeWarning(id: number): Promise<{ message?: string }> {
  const userId = await requireUserId();
  if (!shoeId.safeParse(id).success) return { message: "No pudimos ocultar el aviso." };
  const { error } = await createAdminClient()
    .from("shoes")
    .update({ warning_hidden_until: addDays(await ownerToday(), 6) })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) return { message: "No pudimos ocultar el aviso." };
  revalidatePath("/");
  return {};
}
