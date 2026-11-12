import type { Metadata } from "next";
import { NoDataYet } from "@/components/onboarding";
import { HEALTH_METRICS, metricByKey } from "@/lib/health/metrics";
import { readMetric } from "@/lib/health/read";
import type { DayValue } from "@/lib/metrics/baseline";
import { correlate, type Correlation } from "@/lib/metrics/correlation";
import { dailyLoads, formCurve } from "@/lib/metrics/form";
import { createClient } from "@/lib/supabase/server";
import { ownerToday } from "@/lib/today";

export const metadata: Metadata = { title: "Patrones" };

const PAGE_SIZE = 1000;
const TWO = new Intl.NumberFormat("es", { maximumFractionDigits: 2, minimumFractionDigits: 2, signDisplay: "always" });

type Pair = { x: string; y: string; lag: number; up: string; down: string };

/** The curated set (R-COR-01). Each sentence comes from the sign and strength of ρ, never from AI. */
const CURATED: Pair[] = [
  { x: "sleep", y: "hrv", lag: 0, up: "Las noches que duermes más, tu HRV sale más alta.", down: "Las noches que duermes más, tu HRV sale más baja." },
  { x: "sleep", y: "paceAtHr", lag: 0, up: "Tras dormir más, corres más lento a la misma FC.", down: "Tras dormir más, corres más rápido a la misma FC." },
  { x: "load", y: "hrv", lag: 1, up: "Tras un día de más carga, tu HRV de la noche siguiente sube.", down: "Tras un día de más carga, tu HRV de la noche siguiente baja." },
  { x: "atl", y: "restingHr", lag: 0, up: "Con más fatiga acumulada, tu FC en reposo sube.", down: "Con más fatiga acumulada, tu FC en reposo baja." },
  { x: "stress", y: "sleepScore", lag: 1, up: "Tras un día más estresante, duermes mejor.", down: "Tras un día más estresante, duermes peor." },
];

const LABELS: Record<string, string> = { load: "Carga (TRIMP)", atl: "Fatiga (ATL)", paceAtHr: "Ritmo a FC fija" };
const label = (key: string) => LABELS[key] ?? metricByKey(key)?.label ?? key;

async function trainingSeries(today: string) {
  const db = await createClient();
  const rows: { local_day: string; trimp: number | null; pace: number | null }[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await db
      .from("activities")
      .select("local_day, activity_loads(trimp), run_metrics(pace_at_hr_s_per_km)")
      .order("local_day")
      .order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw new Error("No pudimos leer tus actividades.");
    rows.push(...data.map((a) => ({ local_day: a.local_day, trimp: a.activity_loads?.trimp ?? null, pace: a.run_metrics?.pace_at_hr_s_per_km ?? null })));
    if (data.length < PAGE_SIZE) break;
  }
  const curve = formCurve(dailyLoads(rows.filter((r) => r.trimp !== null).map((r) => ({ day: r.local_day, trimp: r.trimp! }))), today);
  const paces = new Map<string, number[]>();
  for (const r of rows) if (r.pace !== null) paces.set(r.local_day, [...(paces.get(r.local_day) ?? []), r.pace]);
  return {
    load: curve.map((d) => ({ day: d.day, value: d.load })),
    atl: curve.map((d) => ({ day: d.day, value: d.atl })),
    paceAtHr: [...paces].map(([day, v]) => ({ day, value: v.reduce((s, x) => s + x, 0) / v.length })),
  };
}

function sentence(pair: Pair, c: Correlation) {
  if (!c.enough) return `Datos insuficientes: ${c.n} ${c.n === 1 ? "día" : "días"}. Hacen falta unos 30.`;
  if (c.strength === "muy débil") return "Sin relación clara por ahora.";
  return c.rho > 0 ? pair.up : pair.down;
}

const LEVEL: Record<string, number> = { "muy débil": 0, débil: 1, moderada: 2, fuerte: 3 };

export default async function PatronesPage() {
  const today = await ownerToday();
  const needed = [...new Set(CURATED.flatMap((p) => [p.x, p.y]).filter((k) => HEALTH_METRICS.some((m) => m.key === k)))];
  const [training, ...health] = await Promise.all([trainingSeries(today), ...needed.map((k) => readMetric(metricByKey(k)!, null))]);
  const series: Record<string, DayValue[]> = { ...training, ...Object.fromEntries(needed.map((k, i) => [k, health[i]])) };
  const results = CURATED.map((pair) => ({ pair, c: correlate(series[pair.x] ?? [], series[pair.y] ?? [], pair.lag) }));
  const healthDays = new Set(needed.flatMap((k) => series[k].map((d) => d.day))).size;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-extrabold">Patrones</h1>
        <span className="text-sm text-muted">Qué se mueve junto en tus datos · {healthDays.toLocaleString("es")} días</span>
      </div>
      <NoDataYet />

      <h2 className="mx-0.5 mt-1 text-[17px] font-extrabold">Análisis curados</h2>
      {results.map(({ pair, c }) => {
        const level = c.enough ? LEVEL[c.strength] : -1;
        return (
          <section key={`${pair.x}-${pair.y}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-[20px] bg-card px-4 py-3.5">
            <span className="text-[13px] font-bold text-muted">
              {label(pair.x)} → {label(pair.y)}
              {pair.lag === 1 ? " del día siguiente" : ""}
            </span>
            <div className="row-span-2 flex flex-col items-end gap-1">
              <div className="flex gap-[3px]" aria-hidden>
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`h-2.5 w-3.5 rounded-[3px] ${level >= n ? "bg-primary" : "bg-field"}`} />
                ))}
              </div>
              <span className="text-[11px] font-bold text-muted">{c.enough ? `${c.strength} · ${c.n.toLocaleString("es")} d` : "insuficiente"}</span>
            </div>
            <span className={`text-sm leading-snug ${c.enough ? "" : "text-muted"}`}>{sentence(pair, c)}</span>
            {c.enough ? <span className="col-span-2 text-xs text-muted">Spearman ρ {TWO.format(c.rho)} con {c.n.toLocaleString("es")} días emparejados</span> : null}
          </section>
        );
      })}
      <p className="px-0.5 text-xs leading-snug text-muted">Una correlación no prueba causa. Por debajo de 30 días emparejados no se muestra fuerza.</p>
    </div>
  );
}
