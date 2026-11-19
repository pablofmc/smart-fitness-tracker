import { HEALTH_METRICS } from "@/lib/health/metrics";
import type { Correlation } from "@/lib/metrics/correlation";

/** One thing the explorer can put on either side (R-COR-03). Tags only go on the X side (R-COR-04). */
export type ExplorerOption = {
  key: string;
  label: string;
  group: "Entrenamiento" | "Salud" | "Check-in" | "Etiquetas";
  unit: string;
  /** How a sentence says this went up or down, when "sube" / "baja" would mislead (a higher pace is slower). */
  up?: string;
  down?: string;
};

export const MAX_LAG = 7;
export const TAG_PREFIX = "tag:";

const TRAINING: ExplorerOption[] = [
  { key: "load", label: "Carga (TRIMP)", group: "Entrenamiento", unit: "" },
  { key: "ctl", label: "Fitness (CTL)", group: "Entrenamiento", unit: "" },
  { key: "atl", label: "Fatiga (ATL)", group: "Entrenamiento", unit: "" },
  { key: "tsb", label: "Forma (TSB)", group: "Entrenamiento", unit: "" },
  { key: "paceAtHr", label: "Ritmo a FC fija", group: "Entrenamiento", unit: "s/km", up: "es más lento", down: "es más rápido" },
];

const CHECKIN: ExplorerOption[] = [{ key: "feel", label: "Cómo me sentí", group: "Check-in", unit: "" }];

export function explorerOptions(tags: string[]): ExplorerOption[] {
  return [
    ...TRAINING,
    ...HEALTH_METRICS.map((m): ExplorerOption => ({ key: m.key, label: m.label, group: "Salud", unit: m.unit })),
    ...CHECKIN,
    ...tags.map((name): ExplorerOption => ({ key: TAG_PREFIX + name, label: name, group: "Etiquetas", unit: "" })),
  ];
}

export const isTag = (key: string) => key.startsWith(TAG_PREFIX);

export type ExplorerChoice = { x: ExplorerOption; y: ExplorerOption; lag: number };

const DEFAULT = { x: "sleep", y: "paceAtHr", lag: 1 };

/** Reads the choice from the URL, falling back to the default for anything unknown or out of range. */
export function readChoice(params: { x?: string; y?: string; lag?: string }, options: ExplorerOption[]): ExplorerChoice {
  const find = (key: string | undefined, fallback: string, allowTags: boolean) =>
    options.find((o) => o.key === key && (allowTags || !isTag(o.key))) ?? options.find((o) => o.key === fallback)!;
  const lag = Number(params.lag);
  return {
    x: find(params.x, DEFAULT.x, true),
    y: find(params.y, DEFAULT.y, false),
    lag: Number.isInteger(lag) && lag >= 0 && lag <= MAX_LAG ? lag : DEFAULT.lag,
  };
}

export function lagText(lag: number) {
  return lag === 0 ? "ese mismo día" : lag === 1 ? "al día siguiente" : `${lag} días después`;
}

/** "Sueño" → "sueño", but "HRV" and "FC en reposo" keep their capitals. */
export function inSentence(label: string) {
  return label.length > 1 && label[1] === label[1].toUpperCase() && label[1] !== label[1].toLowerCase() ? label : label[0].toLowerCase() + label.slice(1);
}

/** The verdict, from the sign and strength of ρ only (R-COR-02). */
export function explorerSentence({ x, y, lag }: ExplorerChoice, c: Correlation) {
  if (!c.enough) return `Datos insuficientes: ${c.n} ${c.n === 1 ? "día emparejado" : "días emparejados"}. Hacen falta unos 30.`;
  if (c.strength === "muy débil") return `Sin relación clara en ${c.n.toLocaleString("es")} días.`;
  const moves = c.rho > 0 ? (y.up ?? "sube") : (y.down ?? "baja");
  return `Relación ${c.strength} en ${c.n.toLocaleString("es")} días: cuando ${inSentence(x.label)} ${x.up ?? "sube"}, ${inSentence(y.label)} ${moves} ${lagText(lag)}.`;
}

/** Least squares on the raw values, only to draw the trend line. */
export function trendLine(pairs: { x: number; y: number }[]) {
  const n = pairs.length;
  if (n < 2) return null;
  const mx = pairs.reduce((s, p) => s + p.x, 0) / n;
  const my = pairs.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pairs) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

/** A value in its unit: hours as "7 h 05", a pace as "5:30 /km", anything else rounded. */
export function formatValue(v: number, unit: string) {
  if (unit === "h") {
    const min = Math.round(v * 60);
    return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
  }
  if (unit === "s/km") {
    const s = Math.round(v);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} /km`;
  }
  const rounded = Math.abs(v) < 10 && !Number.isInteger(v) ? Math.round(v * 10) / 10 : Math.round(v);
  return `${rounded.toLocaleString("es")}${unit ? ` ${unit}` : ""}`;
}
