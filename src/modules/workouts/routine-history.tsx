import Link from "next/link";
import { strengthRecords } from "@/lib/metrics/strength";
import { createClient } from "@/lib/supabase/server";
import { lineText, sessionLines } from "./history";
import { exerciseId, exerciseLabel, readLoggedSets } from "./read-sets";

const DAY = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const day = (iso: string) => DAY.format(new Date(`${iso}T00:00:00Z`)).replaceAll(".", "").replace(",", "");
const SHOWN = 20;

/** Every session done with a routine, newest first, with the weight of each exercise (R-STR-08). */
export async function RoutineHistory({ routineId }: { routineId: number }) {
  const db = await createClient();
  const [{ data: sessions, count }, { sets }] = await Promise.all([
    db
      .from("logged_sessions")
      .select("id, local_day, started_at, ended_at, activity_id, logged_sets(id, exercise_name, category, exercise_position, weight_kg, reps, logged_at)", { count: "exact" })
      .eq("routine_id", routineId)
      .order("local_day", { ascending: false })
      .order("started_at", { ascending: false })
      .limit(SHOWN),
    readLoggedSets(),
  ]);
  // Records are judged against every logged set, not just this routine's (R-STR-03).
  const records = new Set(strengthRecords(sets).map((r) => `${r.exercise}|${r.at}`));
  const done = (sessions ?? []).filter((s) => s.logged_sets.length > 0);

  return (
    <section className="flex max-w-xl flex-col gap-3 pt-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">Historial</h2>
        <Link href={`/sesion?rutina=${routineId}`} className="flex h-11 items-center rounded-full bg-primary px-4 text-sm font-extrabold text-on-primary">
          Hoy hago esta rutina
        </Link>
      </div>
      {done.length === 0 ? (
        <p className="rounded-[20px] bg-card px-[18px] py-5 text-center text-[15px] leading-snug text-muted">Todavía no hiciste esta rutina. Cuando anotes una sesión, aquí verás los pesos de cada vez.</p>
      ) : (
        done.map((s) => {
          const lines = sessionLines(
            s.logged_sets.map((x) => ({ id: x.id, exercise: exerciseId(x.category, x.exercise_name), label: exerciseLabel(x.category, x.exercise_name), position: x.exercise_position, kg: Number(x.weight_kg), reps: x.reps })),
            new Set(s.logged_sets.filter((x) => records.has(`${exerciseId(x.category, x.exercise_name)}|${x.logged_at}`)).map((x) => x.id)),
          );
          const end = s.ended_at ?? s.logged_sets.map((x) => x.logged_at).sort().at(-1)!;
          const minutes = Math.max(1, Math.round((Date.parse(end) - Date.parse(s.started_at)) / 60_000));
          return (
            <article key={s.id} className="flex flex-col gap-1 rounded-[20px] bg-card px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3 pb-1">
                <span className="text-[15px] font-extrabold first-letter:uppercase">{day(s.local_day)}</span>
                <span className="text-[13px] text-muted">
                  {minutes} min · {s.logged_sets.length} {s.logged_sets.length === 1 ? "serie" : "series"}
                </span>
              </div>
              {lines.map((l) => (
                <div key={l.exercise} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-sunk py-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-bold">{l.label}</span>
                    {l.record && <span className="shrink-0 rounded-[9px] bg-amber-bg px-2 py-0.5 text-[11px] font-extrabold text-amber-title">Récord</span>}
                  </span>
                  <span className="text-sm tabular-nums">{lineText(l)}</span>
                </div>
              ))}
              {s.activity_id && (
                <Link href={`/actividades/${s.activity_id}`} className="self-start pt-1 text-[13px] font-bold text-accent">
                  Ver la actividad del reloj
                </Link>
              )}
            </article>
          )
        })
      )}
      {(count ?? 0) > SHOWN && <p className="text-xs text-muted">Se muestran las últimas {SHOWN} sesiones.</p>}
    </section>
  );
}
