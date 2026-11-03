import Link from "next/link";
import { TrendChart } from "@/components/trend-chart";
import { formatKm, formatShortDay } from "@/lib/activities/list";
import { mondayOf } from "@/lib/load/weekly";
import { median } from "@/lib/metrics/running";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/sync/streams";
import { clock, EFFORT_LABELS, paceLabel } from "./format";

const PAGE_SIZE = 1000;
const RUN_SPORTS = ["running", "treadmill_running", "trail_running", "track_running", "indoor_running"];
const WHOLE = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });

type Run = {
  id: number;
  local_day: string;
  distance_m: number | null;
  duration_s: number | null;
  run_metrics: { best_1k_s: number | null; best_5k_s: number | null; best_10k_s: number | null; best_21k_s: number | null; pace_at_hr_s_per_km: number | null; target_hr: number | null; cadence_spm: number | null } | null;
};

/** The running module in Tendencias (R-RUN-01, R-RUN-02, R-RUN-04, R-RUN-06). */
export async function RunningTrends({ from, today }: { from: string; today: string }) {
  const db = await createClient();
  const runs: Run[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await db
      .from("activities")
      .select("id, local_day, distance_m, duration_s, run_metrics(best_1k_s, best_5k_s, best_10k_s, best_21k_s, pace_at_hr_s_per_km, target_hr, cadence_spm)")
      .in("sport", RUN_SPORTS)
      .order("local_day")
      .order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw new Error("No pudimos leer tus carreras.");
    runs.push(...(data as Run[]));
    if (data.length < PAGE_SIZE) break;
  }
  if (runs.length === 0) return null;

  const weeks: { monday: string; metres: number; seconds: number; paces: number[]; cadences: number[] }[] = [];
  for (let monday = mondayOf(from); monday <= today; monday = addDays(monday, 7)) weeks.push({ monday, metres: 0, seconds: 0, paces: [], cadences: [] });
  const byMonday = new Map(weeks.map((w) => [w.monday, w]));
  for (const run of runs) {
    const week = byMonday.get(mondayOf(run.local_day));
    if (!week) continue;
    week.metres += run.distance_m ?? 0;
    week.seconds += run.duration_s ?? 0;
    if (run.run_metrics?.pace_at_hr_s_per_km) week.paces.push(run.run_metrics.pace_at_hr_s_per_km);
    if (run.run_metrics?.cadence_spm) week.cadences.push(run.run_metrics.cadence_spm);
  }
  const shown = weeks.slice(-12);
  const peak = Math.max(1, ...shown.map((w) => w.metres));
  const paceWeeks = weeks.map((w) => median(w.paces)).filter((v): v is number => v !== null).map((mean) => ({ mean }));
  const cadenceWeeks = weeks.map((w) => median(w.cadences)).filter((v): v is number => v !== null).map((mean) => ({ mean }));
  const target = runs.findLast((r) => r.run_metrics?.target_hr)?.run_metrics?.target_hr;
  const thisWeek = shown[shown.length - 1];

  // Records: each distance's progression over the whole history, newest record first.
  const records = EFFORT_LABELS.map(({ key, label }) => {
    const history: { id: number; day: string; seconds: number }[] = [];
    for (const run of runs) {
      const seconds = run.run_metrics?.[key];
      if (seconds && (history.length === 0 || seconds < history[history.length - 1].seconds)) history.push({ id: run.id, day: run.local_day, seconds });
    }
    return { label, best: history[history.length - 1], improvements: history.length };
  }).filter((r) => r.best);

  return (
    <>
      <section className="flex flex-col gap-2.5 rounded-3xl bg-card p-[18px]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-extrabold">Correr · volumen semanal</h2>
          <span className="text-[13px] text-muted">{thisWeek ? `esta semana ${formatKm(thisWeek.metres)}` : ""}</span>
        </div>
        <div className="grid h-24 items-end gap-1" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
          {shown.map((w) => (
            <div key={w.monday} className="rounded-sm bg-primary" style={{ height: `${Math.max(2, (w.metres / peak) * 100)}%`, opacity: w.metres ? 1 : 0.2 }} />
          ))}
        </div>
        <span className="text-xs text-muted">Últimas {shown.length} semanas · km por semana</span>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section className="flex flex-col gap-1.5 rounded-[20px] bg-card p-3.5">
          <span className="text-xs font-bold text-muted">Ritmo a {target ?? "tu FC objetivo"} lpm</span>
          <span className="text-[22px] font-extrabold tabular-nums">{paceWeeks.length ? paceLabel(paceWeeks[paceWeeks.length - 1].mean) : "—"}</span>
          <TrendChart points={paceWeeks} label="Ritmo a FC fija por semana" invert />
          <span className="text-xs leading-snug text-muted">Mediana semanal; más arriba es más rápido a la misma FC.</span>
        </section>
        <section className="flex flex-col gap-1.5 rounded-[20px] bg-card p-3.5">
          <span className="text-xs font-bold text-muted">Cadencia</span>
          <span className="text-[22px] font-extrabold tabular-nums">{cadenceWeeks.length ? `${WHOLE.format(cadenceWeeks[cadenceWeeks.length - 1].mean)} ppm` : "—"}</span>
          <TrendChart points={cadenceWeeks} label="Cadencia por semana" />
          <span className="text-xs leading-snug text-muted">Mediana semanal de pasos por minuto.</span>
        </section>
      </div>

      {records.length ? (
        <section className="flex flex-col gap-1 rounded-3xl bg-card p-[18px]">
          <h2 className="mb-1 text-[17px] font-extrabold">Récords</h2>
          {records.map((r) => (
            <Link key={r.label} href={`/actividades/${r.best!.id}`} className="flex items-baseline justify-between gap-3 border-t border-field py-2.5 text-sm">
              <span className="font-bold">{r.label}</span>
              <span className="text-muted">
                <span className="font-extrabold text-ink tabular-nums">{clock(r.best!.seconds)}</span> · {formatShortDay(r.best!.day)} · {r.improvements} {r.improvements === 1 ? "marca" : "marcas"}
              </span>
            </Link>
          ))}
          <span className="pt-1 text-xs text-muted">Solo carreras al aire libre con GPS; las de cinta no cuentan.</span>
        </section>
      ) : null}
    </>
  );
}
