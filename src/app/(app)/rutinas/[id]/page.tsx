import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { RoutineHistory } from "@/modules/workouts/routine-history";
import { BackHeader } from "../back-header";
import { RoutineForm } from "../routine-form";

export const metadata: Metadata = { title: "Editar rutina" };

export default async function EditarRutinaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const db = await createClient();
  const { data: routine } = await db
    .from("routines")
    .select("id, name, file_path, file_type, routine_exercises(position, name, category, target_sets, target_reps, target_kg)")
    .eq("id", Number(id))
    .maybeSingle();
  if (!routine) notFound();

  // The read above went through RLS, so the session is the owner's; the file is private, hence a signed URL.
  const fileUrl = routine.file_path ? ((await createAdminClient().storage.from("routine-files").createSignedUrl(routine.file_path, 3600)).data?.signedUrl ?? null) : null;
  const exercises = [...routine.routine_exercises]
    .sort((a, b) => a.position - b.position)
    .map((e) => ({ name: e.name, category: e.category, targetSets: e.target_sets, targetReps: e.target_reps, targetKg: e.target_kg === null ? null : Number(e.target_kg) }));

  return (
    <div className="flex flex-col gap-4">
      <BackHeader title="Editar rutina" />
      <RoutineForm initial={{ id: routine.id, name: routine.name, fileUrl, fileType: routine.file_type, exercises }} />
      <RoutineHistory routineId={routine.id} />
    </div>
  );
}
