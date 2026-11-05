import { createClient } from "@/lib/supabase/server";
import { clock, EFFORT_LABELS, paceLabel } from "./format";

const ONE = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const WHOLE = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });

/**
 * The running module on a run's detail (R-ACT-03): drift, pace at fixed HR, cadence and the best efforts
 * inside the run. It reads only its own table, so other sports' modules never depend on it.
 */
export async function RunSection({ activityId }: { activityId: number }) {
  const db = await createClient();
  const { data: m } = await db.from("run_metrics").select("*").eq("activity_id", activityId).maybeSingle();
  if (!m) return <p className="rounded-[20px] bg-card px-[18px] py-4 text-sm text-muted">El análisis de carrera aparece después de la próxima sincronización.</p>;

  const efforts = EFFORT_LABELS.map((e) => ({ ...e, seconds: m[e.key] })).filter((e) => e.seconds !== null);
  const insights = [
    {
      label: "Deriva cardíaca",
      value: m.drift_pct === null ? "—" : `${ONE.format(m.drift_pct)} %`,
      text: m.drift_pct === null ? m.drift_reason : m.drift_pct < 5 ? "Tu FC casi no subió en la segunda mitad: buena base aeróbica." : "Tu FC subió bastante en la segunda mitad a igual ritmo.",
    },
    {
      label: m.target_hr ? `Ritmo a ${m.target_hr} lpm` : "Ritmo a FC fija",
      value: m.pace_at_hr_s_per_km === null ? "—" : paceLabel(m.pace_at_hr_s_per_km),
      text: m.pace_at_hr_s_per_km === null ? m.pace_at_hr_reason : "Ritmo medio de los tramos a tu FC objetivo, sin los primeros 10 min.",
    },
    { label: "Cadencia", value: m.cadence_spm === null ? "—" : `${WHOLE.format(m.cadence_spm)} ppm`, text: m.cadence_spm === null ? "El reloj no la grabó." : "Pasos por minuto de media." },
  ];

  return (
    <>
      <h2 className="mx-0.5 mt-1 text-[17px] font-extrabold">Lo que dice esta carrera</h2>
      {insights.map((it) => (
        <section key={it.label} className="flex flex-col gap-1 rounded-[20px] bg-card px-[18px] py-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-bold text-muted">{it.label}</span>
            <span className="text-xl font-extrabold text-accent tabular-nums">{it.value}</span>
          </div>
          <span className="text-[15px] leading-snug">{it.text}</span>
        </section>
      ))}
      <section className="flex flex-col gap-2 rounded-[20px] bg-card px-[18px] py-4">
        <span className="text-[13px] font-bold text-muted">Mejores tramos dentro de esta carrera</span>
        {m.counts_for_records ? (
          efforts.length ? (
            <div className="grid grid-cols-4 gap-2">
              {efforts.map((e) => (
                <div key={e.key} className="flex flex-col">
                  <span className="text-lg font-extrabold tabular-nums">{clock(e.seconds!)}</span>
                  <span className="text-xs text-muted">{e.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted">Más corta que 1 km.</span>
          )
        ) : (
          <span className="text-sm text-muted">No cuenta para récords: es en cinta o sin GPS.</span>
        )}
      </section>
    </>
  );
}
