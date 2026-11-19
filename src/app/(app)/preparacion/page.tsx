import type { Metadata } from "next";
import Link from "next/link";
import { formatDuration } from "@/lib/activities/list";
import { formatShortDate } from "@/lib/format";
import { metricByKey, metricSeries } from "@/lib/health/metrics";
import { readHealthDays } from "@/lib/health/read";
import type { Baseline } from "@/lib/metrics/baseline";
import { dailyLoads, formCurve } from "@/lib/metrics/form";
import { READINESS_WEIGHTS, readinessOn } from "@/lib/metrics/readiness";
import { dayVerdict } from "@/lib/metrics/verdict";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/sync/streams";
import { ownerToday } from "@/lib/today";

export const metadata: Metadata = { title: "Preparación" };

const WHOLE = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
const ONE = new Intl.NumberFormat("es", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const HISTORY_DAYS = 14;
const MIN_HRV_NIGHTS = 14;
const hours = (h: number) => formatDuration(h * 3600);
const pct = (w: number) => `${Math.round(w * 100)} %`;

function where(b: Extract<Baseline, { available: true }>) {
  return b.position === "below" ? "por debajo de" : b.position === "above" ? "por encima de" : "dentro de";
}

function formWords(tsb: number) {
  if (tsb < -30) return "mucha fatiga acumulada";
  if (tsb < -10) return "algo de fatiga acumulada";
  if (tsb <= 5) return "equilibrada";
  return "fresco";
}

/** "Por qué este número": each input of the readiness score and the arithmetic (R-LOAD-06, R-UI-05). */
export default async function PreparacionPage() {
  const today = await ownerToday();
  const db = await createClient();
  const hrvMetric = metricByKey("hrv")!;
  const sleepMetric = metricByKey("sleep")!;
  const [health, { data: acts, error }] = await Promise.all([
    readHealthDays([...new Set([...hrvMetric.sources, ...sleepMetric.sources].map((s) => s.kind))], addDays(today, -60 - HISTORY_DAYS - 7)),
    db.from("activities").select("local_day, activity_loads(trimp)").gte("local_day", addDays(today, -400)).order("local_day"),
  ]);
  if (error) throw new Error("No pudimos leer tus actividades.");

  const hrv = metricSeries(hrvMetric, health);
  const sleep = metricSeries(sleepMetric, health);
  const curve = formCurve(
    dailyLoads((acts ?? []).filter((a) => a.activity_loads?.trimp != null).map((a) => ({ day: a.local_day, trimp: a.activity_loads!.trimp! }))),
    today,
  );
  const now = readinessOn(today, { hrv, sleep, curve });
  const r = now.readiness;
  const verdict = dayVerdict({ hrv: now.hrv, sleep: now.sleep, tsb: now.tsb });
  const yesterday = curve.find((c) => c.day === addDays(today, -1));

  const history = Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const day = addDays(today, i - HISTORY_DAYS + 1);
    const x = readinessOn(day, { hrv, sleep, curve }).readiness;
    return { day, score: x.available ? x.score : null };
  });
  const scored = history.filter((h) => h.score !== null);
  const average = scored.length ? Math.round(scored.reduce((s, h) => s + h.score!, 0) / scored.length) : null;
  const gaps = history.filter((h) => h.score === null).map((h) => formatShortDate(h.day).replace(/ \d{4}$/, ""));
  const hrvNights = hrv.filter((d) => d.day >= addDays(today, -60) && d.day < today).length;

  const parts =
    r.available && now.hrv.available && now.sleep.available
      ? [
          {
            name: "HRV",
            score: r.hrv.score,
            weight: READINESS_WEIGHTS.hrv,
            text: `Tu HRV de 7 días (${WHOLE.format(now.hrv.value)} ms) está ${where(now.hrv)} tu rango normal.`,
            how: `Media de ${now.hrv.inputs.recentDays} noches contra tu rango de ${now.hrv.inputs.rangeDays} noches: ${WHOLE.format(now.hrv.low)}–${WHOLE.format(now.hrv.high)} ms (media ± 1 desviación). 50 es tu media; 75, el borde alto del rango.`,
          },
          {
            name: "Sueño",
            score: r.sleep.score,
            weight: READINESS_WEIGHTS.sleep,
            text: `Dormiste ${hours(now.sleep.value)}, ${where(now.sleep)} tu rango normal.`,
            how: `Anoche contra tu rango de ${now.sleep.inputs.rangeDays} noches: ${hours(now.sleep.low)} – ${hours(now.sleep.high)}.`,
          },
          {
            name: "Forma",
            score: r.form.score,
            weight: READINESS_WEIGHTS.form,
            text: `Forma ${WHOLE.format(r.form.tsb)}: ${formWords(r.form.tsb)}.`,
            how: `${yesterday ? `TSB = fitness de ayer (${WHOLE.format(yesterday.ctl)}) − fatiga de ayer (${WHOLE.format(yesterday.atl)}). ` : ""}Cuenta 70 + 2 × TSB: 70 con forma 0, 50 con −10.`,
          },
        ]
      : [];

  return (
    <div className="flex flex-col gap-3.5">
      <Link href="/" className="flex h-11 w-fit items-center gap-1.5 rounded-full bg-card pr-3.5 pl-2.5 text-sm font-bold">
        <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Hoy
      </Link>

      {r.available ? (
        <>
          <section className="flex flex-col gap-2.5 rounded-3xl bg-hero px-5 py-[22px] text-on-hero">
            <span className="text-[13px] font-semibold opacity-80">Preparación de hoy</span>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[56px] leading-none font-extrabold tabular-nums">{r.score}</span>
              <span className="text-base font-bold opacity-80">de 100 · {r.band}</span>
            </div>
            <p className="text-[15px] leading-normal opacity-90">Sale de tres cosas: tu HRV, cómo dormiste y tu forma. Así se calculó hoy.</p>
          </section>

          <section className="flex flex-col rounded-3xl bg-card px-[18px] py-2">
            {parts.map((p, i) => (
              <div key={p.name} className={`flex flex-col gap-2 py-3.5 ${i ? "border-t border-field" : ""}`}>
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="text-[15px] font-extrabold">{p.name}</span>
                  <span className="text-[13px] font-bold text-muted tabular-nums">
                    {p.score} / 100 · pesa {pct(p.weight)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-field" aria-hidden>
                  <div className={`h-full rounded-full ${p.score < 40 ? "bg-warn-btn" : "bg-primary"}`} style={{ width: `${p.score}%` }} />
                </div>
                <span className="text-sm leading-snug">{p.text}</span>
                <span className="text-xs leading-snug text-muted">{p.how}</span>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2 rounded-3xl bg-card p-[18px]">
            <h2 className="text-[17px] font-extrabold">La cuenta</h2>
            <div className="flex flex-col text-[15px] leading-[1.7] tabular-nums">
              {parts.map((p) => (
                <div key={p.name} className="flex justify-between">
                  <span>
                    {p.name} {p.score} × {pct(p.weight)}
                  </span>
                  <span>{ONE.format(p.score * p.weight)}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-field pt-1 font-extrabold">
                <span>Preparación</span>
                <span>{r.score}</span>
              </div>
            </div>
            <span className="text-xs leading-snug text-muted">Es nuestra fórmula, no la de Garmin. La suma se redondea al final.</span>
          </section>
        </>
      ) : (
        <section className="flex flex-col gap-2.5 rounded-3xl bg-card px-5 py-[22px]">
          <span className="text-[13px] font-semibold text-muted">Preparación de hoy</span>
          <span className="text-[22px] leading-tight font-extrabold">Sin número todavía.</span>
          {r.reason === "sin línea base de HRV" ? (
            <>
              <p className="text-[15px] leading-normal">
                Para comparar tu HRV con lo normal para ti hacen falta al menos {MIN_HRV_NIGHTS} noches con HRV en los últimos 60 días, y 3 en la última semana. Llevas {hrvNights} en los 60 días.
              </p>
              <div className="h-2.5 overflow-hidden rounded-full bg-field" aria-hidden>
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (hrvNights / MIN_HRV_NIGHTS) * 100)}%` }} />
              </div>
            </>
          ) : (
            <p className="text-[15px] leading-normal">
              {r.reason === "sin sueño de anoche"
                ? "El reloj no registró tu sueño de anoche, así que hoy no hay número. Mañana vuelve."
                : r.reason === "sin línea base de sueño"
                  ? "Para comparar tu sueño con lo normal para ti hacen falta al menos 14 noches en los últimos 60 días."
                  : "Todavía no hay carga calculada para saber tu forma (TSB)."}
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2.5 rounded-3xl bg-card p-[18px]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-extrabold">Últimos {HISTORY_DAYS} días</h2>
          {average !== null ? <span className="text-[13px] text-muted">media {average}</span> : null}
        </div>
        <div
          className="grid h-[110px] grid-cols-14 items-end gap-1 border-b border-field"
          role="img"
          aria-label={`Preparación de los últimos ${HISTORY_DAYS} días${scored.length ? `, entre ${Math.min(...scored.map((h) => h.score!))} y ${Math.max(...scored.map((h) => h.score!))}` : ""}${gaps.length ? `; ${gaps.length} sin dato` : ""}`}
        >
          {history.map((h, i) =>
            h.score === null ? (
              <div key={h.day} className="h-1.5 rounded-sm border border-dashed border-muted" />
            ) : (
              <div key={h.day} className={`rounded-t ${i === history.length - 1 ? "bg-primary" : h.score < 40 ? "bg-warn-btn" : "bg-line"}`} style={{ height: `${Math.max(2, h.score)}%` }} />
            ),
          )}
        </div>
        <div className="flex justify-between text-[11px] text-muted">
          <span>{formatShortDate(history[0].day).replace(/ \d{4}$/, "")}</span>
          <span>hoy</span>
        </div>
        {gaps.length ? <span className="text-xs text-muted">Sin número {gaps.length === 1 ? `el ${gaps[0]}` : `${gaps.length} días (${gaps.join(", ")})`}: faltó el sueño o la línea base.</span> : null}
      </section>

      <section className="flex flex-col gap-1.5 rounded-3xl bg-card p-[18px]">
        <h2 className="text-[17px] font-extrabold">La frase de Hoy</h2>
        <span className="text-[15px] leading-snug">{verdict.sentence}</span>
        <span className="text-xs leading-snug text-muted">
          Sale de la regla {verdict.rule}, a partir de: {verdict.inputs.join(" · ")}.
        </span>
      </section>
    </div>
  );
}
