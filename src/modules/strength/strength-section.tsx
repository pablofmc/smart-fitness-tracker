import { createClient } from "@/lib/supabase/server";
import { sportsInGroup } from "@/lib/activities/list";
import { addDays } from "@/lib/sync/streams";
import { GROUP_COLORS, groupsLine, setTime } from "./format";
import { exerciseName, GROUP_ORDER, UNCLASSIFIED, weeklyFrequency, type ExerciseTotal, type GroupName } from "./sets";

const WHOLE = new Intl.NumberFormat("es", { maximumFractionDigits: 0, useGrouping: "always" });

/**
 * The strength module on a session's detail (R-ACT-03, R-STR-04, R-STR-06): sets, reps and time per muscle group
 * and per exercise, and how often each group was trained that week. It reads only its own table.
 */
export async function StrengthSection({ activityId }: { activityId: number }) {
  const db = await createClient();
  const { data: s, error } = await db.from("strength_sessions").select("*, activities(local_day)").eq("activity_id", activityId).maybeSingle();
  if (error) throw new Error("No pudimos leer tus series.");
  if (!s) return <p className="rounded-[20px] bg-card px-[18px] py-4 text-sm text-muted">El análisis de fuerza aparece después de la próxima sincronización.</p>;
  if (s.total_sets === 0) return <p className="rounded-[20px] bg-card px-[18px] py-4 text-sm text-muted">El reloj no registró series en esta sesión.</p>;

  const day = s.activities!.local_day;
  const { data: week, error: weekError } = await db
    .from("activities")
    .select("local_day, strength_sessions(group_sets)")
    .in("sport", sportsInGroup("strength_training"))
    .gte("local_day", addDays(day, -6))
    .lte("local_day", day);
  if (weekError) throw new Error("No pudimos leer tus series.");

  const groupSets = s.group_sets as Partial<Record<GroupName, number>>;
  const exercises = s.exercises as ExerciseTotal[];
  const groups = GROUP_ORDER.filter((g) => groupSets[g]).map((g) => ({ group: g, sets: groupSets[g]! }));
  const peak = Math.max(1, ...groups.map((g) => g.sets));
  const frequency = weeklyFrequency(
    (week ?? []).map((a) => ({ day: a.local_day, groupSets: (a.strength_sessions?.group_sets ?? {}) as Partial<Record<GroupName, number>> })),
    day,
  );
  const line = groupsLine(groupSets);

  return (
    <>
      <section className="flex flex-col gap-2.5 rounded-3xl bg-card p-[18px]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-extrabold">Por grupo muscular</h2>
          <span className="text-xs text-muted">series</span>
        </div>
        {line ? <span className="text-sm font-semibold text-ink-soft">{line}</span> : null}
        <dl className="grid grid-cols-3 gap-2.5 pb-1">
          {[
            { v: WHOLE.format(s.total_sets), l: "series" },
            { v: s.total_reps ? WHOLE.format(s.total_reps) : "—", l: "reps" },
            { v: `${Math.round(s.active_s / 60)} min`, l: "tiempo activo" },
          ].map((stat) => (
            <div key={stat.l} className="flex flex-col-reverse gap-px">
              <dt className="text-xs text-muted">{stat.l}</dt>
              <dd className="text-xl font-extrabold tabular-nums">{stat.v}</dd>
            </div>
          ))}
        </dl>
        {groups.map(({ group, sets }) => (
          <div key={group} className="grid grid-cols-[104px_minmax(0,1fr)_28px] items-center gap-2.5">
            <span className={`text-sm font-bold ${group === UNCLASSIFIED ? "text-muted italic" : ""}`}>{group}</span>
            <div className="h-2.5 overflow-hidden rounded bg-sunk">
              <div className={`h-2.5 rounded ${GROUP_COLORS[group]}`} style={{ width: `${Math.round((sets / peak) * 100)}%` }} />
            </div>
            <span className="text-right text-sm font-extrabold tabular-nums">{sets}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-1 rounded-3xl bg-card p-[18px]">
        <h2 className="mb-1.5 text-[17px] font-extrabold">Ejercicios</h2>
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-1 text-left font-bold">Ejercicio</th>
              <th className="text-right font-bold">Series</th>
              <th className="text-right font-bold">Reps</th>
              <th className="text-right font-bold">Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((e) => (
              <tr key={e.category} className="border-t border-field">
                <td className={`py-2.5 font-semibold ${e.category === "unknown" ? "text-muted italic" : ""}`}>{exerciseName(e.category)}</td>
                <td className="text-right">{e.sets}</td>
                <td className="text-right">{e.reps ? WHOLE.format(e.reps) : "—"}</td>
                <td className="text-right">{e.seconds ? setTime(e.seconds) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="pt-1.5 text-xs leading-snug text-muted">
          {s.unknown_sets ? (
            <>
              El reloj no reconoció {s.unknown_sets === 1 ? "1 serie: cuenta" : `${s.unknown_sets} series: cuentan`} como <strong>sin clasificar</strong>.{" "}
            </>
          ) : null}
          Garmin no envía pesos, así que no hay kg ni 1RM.
        </span>
      </section>

      <section className="flex flex-col gap-0.5 rounded-[20px] bg-card px-[18px] py-3.5">
        <span className="text-sm font-bold">Frecuencia</span>
        <span className="text-[13px] text-muted">
          {frequency.length
            ? frequency.map((f, i) => `${i === 0 ? f.group : f.group.toLowerCase()} ${f.sessions === 1 ? "1 vez" : `${f.sessions} veces`}`).join(" · ") + " en los últimos 7 días"
            : "Ningún grupo reconocido en los últimos 7 días."}
        </span>
      </section>
    </>
  );
}
