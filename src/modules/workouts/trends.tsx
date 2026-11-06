import Link from "next/link";
import { dailyBest1RM, strengthRecords, weeklyVolume } from "@/lib/metrics/strength";
import { addDays } from "@/lib/sync/streams";
import { GROUP_COLORS } from "@/modules/strength/format";
import { GROUP_ORDER, type GroupName } from "@/modules/strength/sets";
import { readLoggedSets } from "./read-sets";

const KG = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const WHOLE = new Intl.NumberFormat("es", { maximumFractionDigits: 0, useGrouping: "always" });
const SHORT = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" });
const short = (day: string) => SHORT.format(new Date(`${day}T00:00:00Z`)).replaceAll(".", "");
const WEEKS = 8;

function mondayOf(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

/**
 * Tendencias › Fuerza from the sets I log (R-STR-01..03, canvas: C2-Tendencias-Fuerza): volume per week and
 * group, the estimated 1RM of one exercise, and records. Nothing here comes from the watch.
 */
export async function LoggedStrengthTrends({ today, exercise, href }: { today: string; exercise?: string; href: (exercise: string) => string }) {
  const { sets, labels } = await readLoggedSets();
  if (sets.length === 0) {
    return <p className="rounded-[20px] bg-card px-[18px] py-6 text-center text-[15px] leading-snug text-muted">Cuando anotes series en una sesión aparecen aquí tu volumen, tu 1RM estimado y tus récords.</p>;
  }

  // Volume: the last weeks up to today; a week without logged sets reads "sin datos", not zero.
  const byWeek = new Map(weeklyVolume(sets).map((w) => [w.monday, w]));
  const lastMonday = mondayOf(today);
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(lastMonday, -7 * (WEEKS - 1 - i))).map((monday) => ({ monday, week: byWeek.get(monday) ?? null }));
  const peak = Math.max(1, ...weeks.map((w) => w.week?.total ?? 0));
  const groups = GROUP_ORDER.filter((g) => weeks.some((w) => w.week?.byGroup[g]));
  const thisWeek = byWeek.get(lastMonday);

  // 1RM: exercises with at least one set Epley can use, most-logged first.
  const counts = new Map<string, number>();
  for (const s of sets) if (s.kg > 0 && s.reps <= 10) counts.set(s.exercise, (counts.get(s.exercise) ?? 0) + 1);
  const choices = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const chosen = exercise && choices.includes(exercise) ? exercise : choices[0];
  const series = chosen ? dailyBest1RM(sets, chosen) : [];
  const records = strengthRecords(sets);
  const recordDays = new Set(records.filter((r) => r.exercise === chosen && r.kinds.includes("1rm")).map((r) => r.day));

  const W = 320;
  const H = 140;
  const lo = Math.min(...series.map((p) => p.value)) * 0.95;
  const hi = Math.max(...series.map((p) => p.value)) * 1.05;
  const x = (i: number) => (series.length === 1 ? W / 2 : 8 + (i * (W - 16)) / (series.length - 1));
  const y = (v: number) => (hi === lo ? H / 2 : H - 10 - ((v - lo) / (hi - lo)) * (H - 20));
  const first = series[0];
  const last = series.at(-1);

  // Records: the latest per exercise.
  const latest = new Map<string, (typeof records)[number]>();
  for (const r of records) latest.set(r.exercise, r);
  const recordList = [...latest.values()].sort((a, b) => b.day.localeCompare(a.day) || b.at.localeCompare(a.at)).slice(0, 8);

  return (
    <>
      <section className="flex flex-col gap-3 rounded-3xl bg-card p-[18px]">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-extrabold">Volumen por semana</h2>
          <span className="text-[13px] text-muted">kg × reps de las series que anotaste, por grupo muscular</span>
        </div>
        <div className="flex h-44 items-end gap-2 border-b border-field">
          {weeks.map(({ monday, week }) => (
            <div key={monday} className="flex h-full flex-1 flex-col justify-end gap-px" title={week ? `${WHOLE.format(week.total)} kg` : "Sin datos"}>
              {week ? (
                GROUP_ORDER.filter((g) => week.byGroup[g])
                  .reverse()
                  .map((g, i) => <div key={g} className={`${GROUP_COLORS[g as GroupName]} ${i === 0 ? "rounded-t" : ""}`} style={{ height: `${(week.byGroup[g]! / peak) * 100}%` }} />)
              ) : (
                <span className="pb-1 text-center text-[10px] leading-tight text-muted">sin datos</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 text-center text-[11px] text-muted">
          {weeks.map(({ monday }) => (
            <span key={monday} className="flex-1">
              {short(monday)}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3.5 text-xs font-semibold">
          {groups.map((g) => (
            <span key={g} className="flex items-center gap-1.5">
              <span className={`inline-block size-2.5 rounded-sm ${GROUP_COLORS[g]}`} />
              {g}
            </span>
          ))}
        </div>
        <span className="text-xs leading-snug text-muted">{thisWeek ? `Esta semana: ${WHOLE.format(thisWeek.total)} kg.` : "Esta semana todavía no anotas series."} Las semanas sin series anotadas no cuentan como cero.</span>
      </section>

      {chosen && first && last && (
        <section className="flex flex-col gap-3 rounded-3xl bg-card p-[18px]">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-extrabold">1RM estimado</h2>
            <span className="text-[13px] text-muted">Fórmula de Epley con tu mejor serie de cada día (1–10 reps)</span>
          </div>
          <div role="group" aria-label="Ejercicio" className="flex flex-wrap gap-1.5">
            {choices.slice(0, 8).map((id) => (
              <Link key={id} href={href(id)} aria-current={id === chosen ? "true" : undefined} scroll={false} className={`flex h-9 items-center rounded-full px-3 text-[13px] font-bold ${id === chosen ? "bg-primary text-on-primary" : "bg-sunk"}`}>
                {labels.get(id)}
              </Link>
            ))}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums">{KG.format(last.value)} kg</span>
            {series.length > 1 && (
              <span className="text-sm font-bold text-accent">
                {last.value >= first.value ? "+" : "−"}
                {KG.format(Math.abs(last.value - first.value))} kg desde el {short(first.day)}
              </span>
            )}
          </div>
          <div className="relative h-36" role="img" aria-label={`1RM estimado de ${labels.get(chosen)} por día: de ${KG.format(first.value)} a ${KG.format(last.value)} kg`}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full">
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="stroke-field" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
              {series.length > 1 && <polyline points={series.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
            </svg>
            {series.map((p, i) => (
              <span
                key={p.day}
                title={`${short(p.day)}: ${KG.format(p.value)} kg (${p.inputs})`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card ${recordDays.has(p.day) ? "size-3.5 bg-warn-btn" : "size-2.5 bg-primary"}`}
                style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(p.value) / H) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-muted">
            <span>{short(first.day)}</span>
            <span>{short(last.day)}</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block size-2.5 rounded-full bg-warn-btn" /> Récord de 1RM ese día
          </span>
        </section>
      )}

      <section className="flex flex-col gap-1 rounded-3xl bg-card p-[18px]">
        <h2 className="mb-1.5 text-[17px] font-extrabold">Récords</h2>
        {recordList.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay récords: la primera vez que anotas un ejercicio queda como punto de partida.</p>
        ) : (
          recordList.map((r) => (
            <div key={`${r.exercise}-${r.at}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-t border-field py-2.5">
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{labels.get(r.exercise)}</span>
                <span className="text-xs text-muted">
                  {r.kinds.includes("weight") && r.kinds.includes("1rm") ? "Récord de peso y de 1RM" : r.kinds.includes("weight") ? "Récord de peso" : "Récord de 1RM"} el {short(r.day)} · {KG.format(r.kg)} kg × {r.reps}
                </span>
              </span>
              <span className="flex flex-col items-end gap-0.5 tabular-nums">
                <span className="text-[15px] font-extrabold">{KG.format(r.kg)} kg</span>
                {r.e1rm !== null && <span className="text-xs text-muted">1RM {KG.format(r.e1rm)} kg</span>}
              </span>
            </div>
          ))
        )}
      </section>
    </>
  );
}
