import type { Baseline } from "./baseline";

/** A sentence, the rule that produced it and the inputs it read, so the screen can show its working (R-UI-05). */
export type Verdict = { sentence: string; detail: string; rule: string; inputs: string[] };

const WHOLE = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
const ONE = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

const describe = (label: string, b: Baseline, unit: string, format = WHOLE) =>
  b.available ? `${label} ${format.format(b.value)} ${unit} (rango ${format.format(b.low)}–${format.format(b.high)})`.replace(/\s+\)/, ")") : `${label}: ${b.reason}`;

/**
 * Hoy's verdict. Rules are checked in order and the first that matches wins:
 * 1 HRV below range · 2 TSB under −30 · 3 sleep below range · 4 HRV within or above range with TSB ≥ −10 · 5 otherwise.
 */
export function dayVerdict({ hrv, sleep, tsb }: { hrv: Baseline; sleep: Baseline; tsb: number | null }): Verdict {
  const inputs = [describe("HRV 7 días", hrv, "ms"), describe("Sueño anoche", sleep, "h", ONE), tsb === null ? "Forma (TSB): sin carga calculada" : `Forma (TSB) ${WHOLE.format(tsb)}`];

  if (hrv.available && hrv.position === "below")
    return { sentence: "Día para ir suave.", detail: "Tu HRV está por debajo de tu rango normal: tu cuerpo aún se está recuperando.", rule: "1 · HRV bajo tu rango", inputs };
  if (tsb !== null && tsb < -30)
    return { sentence: "Mucha fatiga acumulada: prioriza descansar.", detail: "Tu frescura (TSB) está por debajo de −30.", rule: "2 · TSB < −30", inputs };
  if (sleep.available && sleep.position === "below")
    return { sentence: "Dormiste menos de lo normal: entrena con calma.", detail: "Anoche quedó por debajo de tu rango habitual de sueño.", rule: "3 · Sueño bajo tu rango", inputs };
  if (hrv.available && hrv.position !== "below" && tsb !== null && tsb >= -10)
    return { sentence: "Buen día para calidad: series o tempo.", detail: "Tu HRV está en tu rango o por encima y no vienes con mucha fatiga.", rule: "4 · HRV en rango y TSB ≥ −10", inputs };
  return { sentence: "Día normal: entrena según tu plan.", detail: "Ninguna señal fuera de lo habitual.", rule: "5 · Sin señales fuera de rango", inputs };
}

/** An activity's verdict: its TRIMP against the mean of the same sport group's previous sessions. */
export function activityVerdict({ trimp, previous, group }: { trimp: number | null; previous: number[]; group: string }): Verdict | null {
  if (trimp === null) return null;
  if (previous.length < 3) return { sentence: "Aún hay pocas sesiones para comparar.", detail: "", rule: "A0 · Menos de 3 sesiones previas del deporte", inputs: [`TRIMP ${WHOLE.format(trimp)}`] };
  const mean = previous.reduce((s, v) => s + v, 0) / previous.length;
  const ratio = trimp / mean;
  const inputs = [`TRIMP ${WHOLE.format(trimp)}`, `Media de tus ${previous.length} sesiones anteriores de ${group.toLowerCase()}: ${WHOLE.format(mean)}`];
  if (ratio >= 1.3) return { sentence: "Sesión exigente: bastante más carga que tu media.", detail: "", rule: "A1 · TRIMP ≥ 130 % de la media", inputs };
  if (ratio <= 0.7) return { sentence: "Sesión suave: menos carga que tu media.", detail: "", rule: "A2 · TRIMP ≤ 70 % de la media", inputs };
  return { sentence: "Sesión típica para ti.", detail: "", rule: "A3 · TRIMP entre 70 % y 130 % de la media", inputs };
}
