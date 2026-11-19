import type { Metadata } from "next";
import { NoDataYet } from "@/components/onboarding";
import { HEALTH_METRICS, metricByKey } from "@/lib/health/metrics";
import { readMetric } from "@/lib/health/read";
import type { DayValue } from "@/lib/metrics/baseline";
import { compareTag, correlate, type Correlation } from "@/lib/metrics/correlation";
import { dailyLoads, formCurve } from "@/lib/metrics/form";
import { createClient } from "@/lib/supabase/server";
import { ownerToday } from "@/lib/today";
import { explorerOptions, formatValue, isTag, readChoice } from "@/modules/insights/explorer";
import { Explorer } from "./explorer";
import { TagCard, type TagPair } from "./tag-card";

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

/**
 * Check-in tags against what they might move (R-COR-04). The tag is on day d, and the night metrics
 * (HRV, sleep) of day d + 1 are the night after it.
 */
const TAG_PAIRS: TagPair[] = [
  { tag: "Alcohol", metric: "hrv", lag: 1, title: "Alcohol → HRV de la noche siguiente", lead: "Tras beber", subject: "tu HRV", withLabel: "Con alcohol", withoutLabel: "Sin alcohol" },
  { tag: "Café tarde", metric: "deepSleep", lag: 1, title: "Café tarde → sueño profundo", lead: "Con café por la tarde", subject: "tu sueño profundo", withLabel: "Con café", withoutLabel: "Sin café" },
  { tag: "Estrés trabajo", metric: "sleepScore", lag: 1, title: "Estrés en el trabajo → sueño", lead: "Tras un día de estrés en el trabajo", subject: "tu puntuación de sueño", withLabel: "Con estrés", withoutLabel: "Sin estrés" },
  { tag: "Viaje", metric: "restingHr", lag: 1, title: "Viaje → FC en reposo", lead: "Viajando", subject: "tu FC en reposo", withLabel: "Viajando", withoutLabel: "En casa" },
  { tag: "Enfermo", metric: "restingHr", lag: 0, title: "Enfermo → FC en reposo", lead: "Estando enfermo", subject: "tu FC en reposo", withLabel: "Enfermo", withoutLabel: "Sano" },
];

async function readCheckins() {
  const db = await createClient();
  const rows: { day: string; tags: string[]; feel: number | null }[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await db.from("checkins").select("day, tags, feel").order("day").range(start, start + PAGE_SIZE - 1);
    if (error) throw new Error("No pudimos leer tus check-ins.");
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

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
    ctl: curve.map((d) => ({ day: d.day, value: d.ctl })),
    atl: curve.map((d) => ({ day: d.day, value: d.atl })),
    tsb: curve.map((d) => ({ day: d.day, value: d.tsb })),
    paceAtHr: [...paces].map(([day, v]) => ({ day, value: v.reduce((s, x) => s + x, 0) / v.length })),
  };
}

function sentence(pair: Pair, c: Correlation) {
  if (!c.enough) return `Datos insuficientes: ${c.n} ${c.n === 1 ? "día" : "días"}. Hacen falta unos 30.`;
  if (c.strength === "muy débil") return "Sin relación clara por ahora.";
  return c.rho > 0 ? pair.up : pair.down;
}

const LEVEL: Record<string, number> = { "muy débil": 0, débil: 1, moderada: 2, fuerte: 3 };

export default async function PatronesPage({ searchParams }: { searchParams: Promise<{ x?: string; y?: string; lag?: string }> }) {
  const [today, params, db] = await Promise.all([ownerToday(), searchParams, createClient()]);
  const { data: tagRows, error: tagError } = await db.from("checkin_tags").select("name").order("created_at");
  if (tagError) throw new Error("No pudimos leer tus etiquetas.");
  const options = explorerOptions(tagRows.map((t) => t.name));
  const choice = readChoice(params, options);
  const needed = [...new Set([...CURATED.flatMap((p) => [p.x, p.y]), ...TAG_PAIRS.map((p) => p.metric)].filter((k) => HEALTH_METRICS.some((m) => m.key === k)))];
  const [training, checkins, ...health] = await Promise.all([trainingSeries(today), readCheckins(), ...needed.map((k) => readMetric(metricByKey(k)!, null))]);
  const series: Record<string, DayValue[]> = {
    ...training,
    feel: checkins.filter((c) => c.feel !== null).map((c) => ({ day: c.day, value: c.feel! })),
    ...Object.fromEntries(needed.map((k, i) => [k, health[i]])),
  };
  // The explorer's two series, read only when the curated set didn't already need them.
  const seriesFor = async (key: string) => (isTag(key) ? [] : (series[key] ?? (metricByKey(key) ? await readMetric(metricByKey(key)!, null) : [])));
  const [xs, ys] = await Promise.all([seriesFor(choice.x.key), seriesFor(choice.y.key)]);
  const results = CURATED.map((pair) => ({ pair, c: correlate(series[pair.x] ?? [], series[pair.y] ?? [], pair.lag) }));
  const healthDays = new Set(needed.flatMap((k) => series[k].map((d) => d.day))).size;
  // Tags this person uses, enough or not, so the cards say how far each one is.
  const usedTags = new Set(checkins.flatMap((c) => c.tags));
  const tagResults = TAG_PAIRS.filter((p) => usedTags.has(p.tag))
    .map((pair) => ({ pair, c: compareTag(checkins, pair.tag, series[pair.metric] ?? [], pair.lag) }))
    .sort((a, b) => Number(b.c.enough) - Number(a.c.enough) || (b.c.enough && a.c.enough ? Math.abs(b.c.d) - Math.abs(a.c.d) : b.c.withTag.length - a.c.withTag.length));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-extrabold">Patrones</h1>
        <span className="text-sm text-muted">Qué se mueve junto en tus datos · {healthDays.toLocaleString("es")} días</span>
      </div>
      <NoDataYet />

      {tagResults.length ? (
        <>
          <h2 className="mx-0.5 mt-1 text-[17px] font-extrabold">Tus etiquetas del check-in</h2>
          {tagResults.map(({ pair, c }) => {
            const metric = metricByKey(pair.metric)!;
            return <TagCard key={`${pair.tag}-${pair.metric}`} pair={pair} c={c} unit={metric.unit} format={(v) => formatValue(v, metric.unit)} />;
          })}
        </>
      ) : (
        <p className="rounded-[20px] bg-card px-4 py-3.5 text-sm leading-snug text-muted">
          Marca etiquetas en el check-in de Hoy (alcohol, café tarde, viaje…) y aquí verás si cambian tu HRV, tu sueño o tu FC en reposo.
        </p>
      )}

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
      <Explorer choice={choice} options={options} xs={xs} ys={ys} checkins={checkins} />

      <p className="px-0.5 text-xs leading-snug text-muted">Una correlación no prueba causa. Por debajo de 30 días emparejados no se muestra fuerza.</p>
    </div>
  );
}
