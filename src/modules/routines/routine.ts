import { z } from "zod";
import { EXERCISE_NAMES } from "@/modules/strength/sets";
import { fold } from "@/modules/gear/search";

/** Exercises a routine can name, from the strength module's Spanish list (warm-up and cardio aren't routine exercises). */
export const ROUTINE_EXERCISES = Object.entries(EXERCISE_NAMES)
  .filter(([key]) => key !== "warmUp" && key !== "cardio")
  .map(([key, name]) => ({ key, name }));

const KNOWN = new Map(ROUTINE_EXERCISES.map((e) => [e.key, e.name]));

/** Files a routine can come from. Images are shrunk in the browser; PDFs go as they are, up to Vercel's request limit. */
export const ROUTINE_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type RoutineFileType = (typeof ROUTINE_FILE_TYPES)[number];
export const ROUTINE_FILE_MAX_BYTES = 4 * 1024 * 1024;

/** One exercise as the form edits it and the database stores it. Targets are optional (R-STR-07). */
export const routineExerciseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().max(40).nullable(),
  targetSets: z.number().int().min(1).max(20).nullable(),
  targetReps: z.string().trim().min(1).max(20).nullable(),
  targetKg: z.number().min(0).max(999).nullable(),
});
export type RoutineExercise = z.infer<typeof routineExerciseSchema>;

/** What the model is asked to return (structured output). Loose on purpose: `cleanProposal` makes it safe. */
export const proposalSchema = z.object({
  exercises: z.array(
    z.object({
      name: z.string().describe("The exercise as written in the routine, in Spanish if possible."),
      category: z.string().nullable().describe("The key from the known exercise list when it is clearly that exercise, else null."),
      target_sets: z.number().nullable(),
      target_reps: z.string().nullable().describe('Reps or time as written, e.g. "8", "8-10", "45 s". Null if not written.'),
      target_kg: z.number().nullable(),
    }),
  ),
});
export type Proposal = z.infer<typeof proposalSchema>;

const MAX_EXERCISES = 40;

/**
 * Turns the model's answer into exercises the form can show: unknown categories become null (typed by
 * hand), out-of-range numbers are dropped, empty names are skipped. Nothing is saved from here.
 */
export function cleanProposal(proposal: Proposal): RoutineExercise[] {
  return proposal.exercises
    .map((e) => {
      const name = e.name.trim().replace(/\s+/g, " ").slice(0, 80);
      const category = e.category && KNOWN.has(e.category) ? e.category : null;
      const sets = e.target_sets !== null && Number.isInteger(e.target_sets) && e.target_sets >= 1 && e.target_sets <= 20 ? e.target_sets : null;
      const reps = e.target_reps?.trim().slice(0, 20) || null;
      const kg = e.target_kg !== null && e.target_kg >= 0 && e.target_kg <= 999 ? Math.round(e.target_kg * 10) / 10 : null;
      return { name, category, targetSets: sets, targetReps: reps, targetKg: kg };
    })
    .filter((e) => e.name.length > 0)
    .slice(0, MAX_EXERCISES);
}

/** The known exercise a typed name matches exactly (ignoring case and accents), so hand-typed names still count in analysis. */
export function matchExercise(name: string): string | null {
  const wanted = fold(name.trim());
  return ROUTINE_EXERCISES.find((e) => fold(e.name) === wanted)?.key ?? null;
}
