import Link from "next/link";
import { TrendChart } from "@/components/trend-chart";
import { HEALTH_METRICS, metricByKey } from "@/lib/health/metrics";
import { readMetric } from "@/lib/health/read";
import { bucketMeans, type Scale } from "@/lib/metrics/trend";

const SCALES: Scale[] = ["semanas", "meses", "años"];
const ONE = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const MONTH = new Intl.DateTimeFormat("es", { month: "short", year: "numeric", timeZone: "UTC" });
const WEEK = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function bucketLabel(bucket: string, scale: Scale) {
  if (scale === "años") return bucket;
  if (scale === "meses") return MONTH.format(new Date(`${bucket}-01T00:00:00Z`)).replace(".", "");
  return `sem. del ${WEEK.format(new Date(`${bucket}T00:00:00Z`)).replace(".", "")}`;
}

/** Any stored health metric over weeks, months or years (R-HLT-03). */
export async function HealthTrends({ metricKey, scale, from, href }: { metricKey: string; scale: Scale; from: string; href: (next: { metrica?: string; escala?: string }) => string }) {
  const metric = metricByKey(metricKey) ?? HEALTH_METRICS[0];
  const series = await readMetric(metric, scale === "semanas" ? from : null);
  const buckets = bucketMeans(series, scale);
  const last = buckets[buckets.length - 1];

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-[18px]">
      <h2 className="text-[17px] font-extrabold">Salud</h2>
      <div role="group" aria-label="Métrica" className="flex gap-2 overflow-x-auto pb-1">
        {HEALTH_METRICS.map((m) => (
          <Link
            key={m.key}
            href={href({ metrica: m.key })}
            aria-current={m.key === metric.key ? "true" : undefined}
            className={`flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-bold ${m.key === metric.key ? "bg-primary text-on-primary" : "bg-sunk text-ink-soft"}`}
          >
            {m.label}
          </Link>
        ))}
      </div>
      <div role="group" aria-label="Escala" className="grid grid-cols-3 gap-1 rounded-2xl bg-sunk p-1">
        {SCALES.map((s) => (
          <Link
            key={s}
            href={href({ escala: s })}
            aria-current={s === scale ? "true" : undefined}
            className={`flex h-10 items-center justify-center rounded-xl text-[13px] font-bold capitalize ${s === scale ? "bg-primary text-on-primary" : "text-ink-soft"}`}
          >
            {s}
          </Link>
        ))}
      </div>
      {last ? (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[22px] font-extrabold tabular-nums">
              {ONE.format(last.mean)} {metric.unit}
            </span>
            <span className="text-xs text-muted">
              {bucketLabel(last.bucket, scale)} · {last.days} {last.days === 1 ? "día" : "días"}
            </span>
          </div>
          <TrendChart points={buckets} label={`${metric.label} por ${scale}`} invert={metric.better === "lower"} />
          <span className="text-xs text-muted">
            Media por {scale === "semanas" ? "semana" : scale === "meses" ? "mes" : "año"} · {buckets.length} puntos desde {bucketLabel(buckets[0].bucket, scale)}
            {metric.better === "lower" ? " · más arriba es mejor (menos)" : ""}
          </span>
        </>
      ) : (
        <p className="text-sm text-muted">Garmin no ha enviado datos de {metric.label.toLowerCase()} en este periodo.</p>
      )}
    </section>
  );
}
