"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/supabase/auth";
import { readRoutineFile } from "@/modules/routines/read-with-ai";
import { exerciseName } from "@/modules/strength/sets";
import { matchExercise, ROUTINE_FILE_MAX_BYTES, ROUTINE_FILE_TYPES, routineExerciseSchema, type RoutineExercise, type RoutineFileType } from "@/modules/routines/routine";

const BUCKET = "routine-files";
const EXT: Record<RoutineFileType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

function routineFile(form: FormData): File | null | "invalid" {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > ROUTINE_FILE_MAX_BYTES || !(ROUTINE_FILE_TYPES as readonly string[]).includes(file.type)) return "invalid";
  return file;
}

export type ReadState = { exercises?: RoutineExercise[]; message?: string };

/**
 * Asks Claude to read the chosen file into a proposed list (R-STR-07, ADR-0006). Nothing is saved but a
 * row in the read log, so Ajustes can count this month's reads; the list only fills the form.
 */
export async function readRoutine(form: FormData): Promise<ReadState> {
  await requireSession();
  const file = routineFile(form);
  if (file === null) return { message: "Elige primero la foto o el PDF de la rutina." };
  if (file === "invalid") return { message: "El archivo debe ser una foto o un PDF de hasta 4 MB." };

  const result = await readRoutineFile(new Uint8Array(await file.arrayBuffer()), file.type as RoutineFileType);
  // Only reads the model answered cost money (ADR-0006); a missing key or a refused request isn't one.
  if (result.usage) {
    await createAdminClient().from("routine_reads").insert({ succeeded: result.ok, input_tokens: result.usage.input, output_tokens: result.usage.output });
    revalidatePath("/ajustes");
  }
  return result.ok ? { exercises: result.exercises } : { message: result.message };
}

const routineInput = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(80),
  exercises: z.array(routineExerciseSchema).max(40),
});

export type SaveState = { message?: string };

/** Creates or updates a routine with its file and exercise list. A routine without exercises is fine. */
export async function saveRoutine(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireSession();
  let exercises: unknown;
  try {
    exercises = JSON.parse(String(form.get("exercises") ?? "[]"));
  } catch {
    return { message: "No pudimos leer la lista de ejercicios." };
  }
  const parsed = routineInput.safeParse({ id: form.get("id") || undefined, name: form.get("name"), exercises });
  if (!parsed.success) return { message: "Revisa el nombre y que cada ejercicio tenga nombre." };
  const file = routineFile(form);
  if (file === "invalid") return { message: "El archivo debe ser una foto o un PDF de hasta 4 MB." };

  const db = createAdminClient();
  const { id, name } = parsed.data;
  let previousPath: string | null = null;
  if (id) {
    const { data } = await db.from("routines").select("file_path").eq("id", id).maybeSingle();
    if (!data) return { message: "Esa rutina ya no existe." };
    previousPath = data.file_path;
  }

  let filePath: string | undefined;
  if (file) {
    filePath = `${crypto.randomUUID()}.${EXT[file.type as RoutineFileType]}`;
    const { error } = await db.storage.from(BUCKET).upload(filePath, file, { contentType: file.type });
    if (error) return { message: "No pudimos subir el archivo." };
  }

  const fields = { name, updated_at: new Date().toISOString(), ...(filePath ? { file_path: filePath, file_type: file && file.type } : {}) };
  const saved = id ? await db.from("routines").update(fields).eq("id", id).select("id").single() : await db.from("routines").insert(fields).select("id").single();
  if (saved.error) {
    if (filePath) await db.storage.from(BUCKET).remove([filePath]);
    return { message: "No pudimos guardar la rutina." };
  }
  const routineId = saved.data.id;

  // The list is replaced as a whole: the form always sends every exercise in order.
  const { error: clearError } = await db.from("routine_exercises").delete().eq("routine_id", routineId);
  const rows = parsed.data.exercises.map((e, position) => {
    const typed = matchExercise(e.name);
    return {
    routine_id: routineId,
    position,
    // A typed name that is a known exercise is stored with its proper spelling ("sentadilla" → "Sentadilla").
    name: typed ? exerciseName(typed) : e.name,
    category: e.category ?? typed,
    target_sets: e.targetSets,
    target_reps: e.targetReps,
    target_kg: e.targetKg,
    };
  });
  const { error: rowsError } = clearError || rows.length === 0 ? { error: clearError } : await db.from("routine_exercises").insert(rows);
  if (rowsError) return { message: "La rutina se guardó, pero no su lista de ejercicios. Intenta de nuevo." };

  if (filePath && previousPath) await db.storage.from(BUCKET).remove([previousPath]);
  revalidatePath("/rutinas");
  redirect("/rutinas");
}

/** Deletes a routine, its exercises and its file. */
export async function deleteRoutine(id: number): Promise<SaveState> {
  await requireSession();
  if (!z.number().int().positive().safeParse(id).success) return { message: "No pudimos borrar la rutina." };
  const db = createAdminClient();
  const { data } = await db.from("routines").delete().eq("id", id).select("file_path").maybeSingle();
  if (data?.file_path) await db.storage.from(BUCKET).remove([data.file_path]);
  revalidatePath("/rutinas");
  redirect("/rutinas");
}
