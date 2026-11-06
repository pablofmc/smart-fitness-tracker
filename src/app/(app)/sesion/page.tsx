import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ownerToday } from "@/lib/today";
import { epley } from "@/lib/metrics/strength";
import { ROUTINE_EXERCISES } from "@/modules/routines/routine";
import { exerciseId, readLoggedSets } from "@/modules/workouts/read-sets";
import type { SessionExercise } from "@/modules/workouts/session";
import { SessionLoader } from "./session-loader";
import type { SessionTemplate } from "./session-screen";

export const metadata: Metadata = { title: "Sesión de fuerza" };

const KG = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

/** Today's strength session, from a routine or empty (R-STR-08, canvas: C2-Sesion). */
export default async function SesionPage({ searchParams }: { searchParams: Promise<{ rutina?: string }> }) {
  const { rutina } = await searchParams;
  const db = await createClient();
  const [localDay, routine, { data: recent }, history] = await Promise.all([
    ownerToday(),
    rutina && /^\d+$/.test(rutina)
      ? db.from("routines").select("id, name, file_path, routine_exercises(position, name, category, target_sets, target_reps, target_kg)").eq("id", Number(rutina)).maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
    // The latest sets, newest first: the first one seen per exercise is "the last time".
    db.from("logged_sets").select("exercise_name, weight_kg, reps, logged_at").order("logged_at", { ascending: false }).limit(1000),
    readLoggedSets(),
  ]);

  // Earlier bests per exercise, so the session can mark a record the moment it happens (R-STR-03).
  const bestById: SessionTemplate["bestById"] = {};
  // Sessions still open (this one, after a reload) don't count: their sets are judged as they're logged.
  for (const s of history.sets.filter((x) => !x.sessionOpen)) {
    const e = epley(s.kg, s.reps);
    const b = bestById[s.exercise] ?? { kg: 0, e1rm: 0 };
    bestById[s.exercise] = { kg: Math.max(b.kg, s.kg), e1rm: Math.max(b.e1rm, e.available ? e.value : 0) };
  }

  const last: SessionTemplate["lastByName"] = {};
  for (const s of recent ?? []) {
    const key = s.exercise_name.toLowerCase();
    if (!last[key]) last[key] = { kg: Number(s.weight_kg), reps: s.reps, day: s.logged_at.slice(0, 10) };
  }

  const exercises: SessionExercise[] = routine
    ? [...routine.routine_exercises]
        .sort((a, b) => a.position - b.position)
        .map((e) => {
          const kg = e.target_kg === null ? null : Number(e.target_kg);
          const parts = [e.target_sets && e.target_reps ? `${e.target_sets} × ${e.target_reps}` : e.target_sets ? `${e.target_sets} series` : e.target_reps, kg !== null ? `${KG.format(kg)} kg` : null].filter(Boolean);
          return { key: `r${e.position}`, name: e.name, category: e.category, target: parts.length ? `Meta: ${parts.join(" · ")}` : null, targetKg: kg, targetReps: e.target_reps, last: last[e.name.toLowerCase()] ?? null, best: bestById[exerciseId(e.category, e.name)] ?? null };
        })
    : [];
  const fileUrl = routine?.file_path ? ((await createAdminClient().storage.from("routine-files").createSignedUrl(routine.file_path, 4 * 3600)).data?.signedUrl ?? null) : null;

  return (
    <SessionLoader
      template={{ routineId: routine?.id ?? null, name: routine?.name ?? "Sesión libre", localDay, exercises, lastByName: last, bestById, fileUrl }}
      knownExercises={ROUTINE_EXERCISES.map((e) => ({ key: e.key, name: e.name }))}
    />
  );
}
