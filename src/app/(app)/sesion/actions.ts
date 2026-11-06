"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/supabase/auth";

const upload = z.object({
  session: z.object({
    id: z.uuid(),
    routineId: z.number().int().positive().nullable(),
    name: z.string().trim().min(1).max(80),
    localDay: z.iso.date(),
    startedAt: z.iso.datetime(),
    endedAt: z.iso.datetime().nullable(),
  }),
  sets: z
    .array(
      z.object({
        id: z.uuid(),
        exerciseName: z.string().trim().min(1).max(80),
        category: z.string().max(40).nullable(),
        exercisePosition: z.number().int().min(0).max(100),
        setNumber: z.number().int().min(1).max(50),
        kg: z.number().min(0).max(999),
        reps: z.number().int().min(1).max(200),
        loggedAt: z.iso.datetime(),
      }),
    )
    .max(300),
  deletedSetIds: z.array(z.uuid()).max(300),
});

export type SessionUpload = z.input<typeof upload>;

/**
 * Saves a logged session as the phone has it (R-STR-08). Every write is an upsert on ids made on the
 * phone, so sending the same sets again after a dropped connection never duplicates them.
 */
export async function uploadSession(input: SessionUpload): Promise<{ ok: boolean }> {
  await requireSession();
  const parsed = upload.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { session, sets, deletedSetIds } = parsed.data;
  const db = createAdminClient();

  const header = await db.from("logged_sessions").upsert({
    id: session.id,
    routine_id: session.routineId,
    name: session.name,
    local_day: session.localDay,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    updated_at: new Date().toISOString(),
  });
  // A routine deleted meanwhile: keep the session without it.
  if (header.error?.code === "23503") {
    const retry = await db.from("logged_sessions").upsert({ id: session.id, routine_id: null, name: session.name, local_day: session.localDay, started_at: session.startedAt, ended_at: session.endedAt });
    if (retry.error) return { ok: false };
  } else if (header.error) return { ok: false };

  if (deletedSetIds.length) {
    const { error } = await db.from("logged_sets").delete().eq("session_id", session.id).in("id", deletedSetIds);
    if (error) return { ok: false };
  }
  if (sets.length) {
    const { error } = await db.from("logged_sets").upsert(
      sets.map((s) => ({
        id: s.id,
        session_id: session.id,
        exercise_name: s.exerciseName,
        category: s.category,
        exercise_position: s.exercisePosition,
        set_number: s.setNumber,
        weight_kg: s.kg,
        reps: s.reps,
        logged_at: s.loggedAt,
      })),
    );
    if (error) return { ok: false };
  }
  if (session.endedAt) revalidatePath("/rutinas");
  return { ok: true };
}

const pick = z.object({ sessionId: z.uuid(), activityId: z.number().int().positive() });

/** "This logged session belongs to that watch activity": my pick sticks, the sync never changes it (R-STR-09). */
export async function linkSessionToActivity(input: z.input<typeof pick>): Promise<{ message?: string }> {
  await requireSession();
  const parsed = pick.safeParse(input);
  if (!parsed.success) return { message: "No pudimos unir la sesión." };
  const db = createAdminClient();
  const { data: activity } = await db.from("activities").select("id").eq("id", parsed.data.activityId).eq("sport", "strength_training").maybeSingle();
  if (!activity) return { message: "Esa actividad de fuerza ya no existe." };
  const { error } = await db.from("logged_sessions").update({ activity_id: parsed.data.activityId, link_source: "manual" }).eq("id", parsed.data.sessionId);
  if (error) return { message: "No pudimos unir la sesión." };
  revalidatePath(`/actividades/${parsed.data.activityId}`);
  return {};
}
