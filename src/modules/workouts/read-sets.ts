import "server-only";
import { readAll } from "@/lib/activities/store";
import type { StrengthSet } from "@/lib/metrics/strength";
import { createClient } from "@/lib/supabase/server";
import { exerciseName, groupOf, UNCLASSIFIED } from "@/modules/strength/sets";

/** How a logged exercise is identified across sessions: its key from the list, else its name typed by hand. */
export const exerciseId = (category: string | null, name: string) => category ?? `name:${name.trim().toLowerCase()}`;
/** The name to show for an exercise id. */
export const exerciseLabel = (category: string | null, name: string) => (category ? exerciseName(category) : name.trim());

/** Every logged set, as the strength metrics read them (R-STR-01..03). Reads through the session, so RLS decides. */
export async function readLoggedSets(): Promise<{ sets: (StrengthSet & { sessionOpen: boolean })[]; labels: Map<string, string> }> {
  const db = await createClient();
  const rows = await readAll((from, to) =>
    db.from("logged_sets").select("id, exercise_name, category, weight_kg, reps, logged_at, logged_sessions(local_day, ended_at)").order("logged_at").order("id").range(from, to),
  );
  const labels = new Map<string, string>();
  const sets = rows.map((r) => {
    const id = exerciseId(r.category, r.exercise_name);
    if (!labels.has(id)) labels.set(id, exerciseLabel(r.category, r.exercise_name));
    return {
      exercise: id,
      group: r.category ? groupOf(r.category) : UNCLASSIFIED,
      day: r.logged_sessions?.local_day ?? r.logged_at.slice(0, 10),
      at: r.logged_at,
      kg: Number(r.weight_kg),
      reps: r.reps,
      sessionOpen: !r.logged_sessions?.ended_at,
    };
  });
  return { sets, labels };
}
