import type { TagComparison } from "@/lib/metrics/correlation";

export type TagPair = {
  tag: string;
  metric: string;
  lag: number;
  /** "Tras beber", completed with "tu HRV baja 9 ms de media". */
  lead: string;
  /** The metric as the sentence names it: "tu HRV". */
  subject: string;
  /** How the strip's rows are named: "Con alcohol" / "Sin alcohol". */
  withLabel: string;
  withoutLabel: string;
  title: string;
};

const LEVEL: Record<string, number> = { "muy débil": 0, débil: 1, moderada: 2, fuerte: 3 };

/** A difference in the metric's own unit, hours as minutes. */
export function formatDiff(value: number, unit: string) {
  const a = Math.abs(value);
  if (unit === "h") return `${Math.round(a * 60)} min`;
  const n = Math.round(a);
  if (unit === "") return `${n} ${n === 1 ? "punto" : "puntos"}`;
  return `${n} ${unit}`;
}

export function tagSentence(pair: TagPair, c: TagComparison, unit: string) {
  if (!c.enough) {
    const short = Math.max(0, 10 - c.withTag.length);
    return short > 0
      ? `Datos insuficientes: ${c.withTag.length} ${c.withTag.length === 1 ? "día" : "días"} con la etiqueta. Hacen falta 10.`
      : `Datos insuficientes: ${c.n} ${c.n === 1 ? "día" : "días"} con check-in. Hacen falta unos 30.`;
  }
  const diff = formatDiff(c.diff, unit);
  if (c.strength === "muy débil" || diff.startsWith("0 ")) return "Sin diferencia clara por ahora.";
  return `${pair.lead}, ${pair.subject} ${c.diff > 0 ? "sube" : "baja"} ${diff} de media.`;
}

/** Each value as a dot along one shared scale, with the group's mean as a bar. */
function Strip({ values, lo, hi, mean, dot, bar, label }: { values: number[]; lo: number; hi: number; mean: number; dot: string; bar: string; label: string }) {
  // Percentages, so dots stay round at any width.
  const x = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%`;
  return (
    <div role="img" aria-label={label} className="relative mx-[3px] h-[26px]">
      {values.map((v, i) => (
        <span key={i} className={`absolute size-[5px] -translate-x-1/2 rounded-full ${dot}`} style={{ left: x(v), top: 3 + ((i * 7) % 16) }} />
      ))}
      <span className={`absolute top-0 h-[26px] w-[3px] -translate-x-1/2 rounded-full ${bar}`} style={{ left: x(mean) }} />
    </div>
  );
}

export function TagCard({ pair, c, unit, format }: { pair: TagPair; c: TagComparison; unit: string; format: (v: number) => string }) {
  const level = c.enough ? LEVEL[c.strength] : -1;
  const all = [...c.withTag, ...c.withoutTag];
  const lo = Math.min(...all);
  const hi = Math.max(...all);

  return (
    <section className="flex flex-col gap-3 rounded-[24px] bg-card p-5">
      <span className="text-xs font-bold text-amber-title">{pair.title}</span>
      <h2 className={`text-[19px] leading-snug font-extrabold ${c.enough ? "" : "text-muted"}`}>{tagSentence(pair, c, unit)}</h2>
      {c.enough ? (
        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
          <span className="text-[13px] font-bold">{pair.withoutLabel}</span>
          <Strip values={c.withoutTag} lo={lo} hi={hi} mean={c.meanWithout} dot="bg-primary/35" bar="bg-primary" label={`${pair.withoutLabel}: ${c.withoutTag.length} días, media ${format(c.meanWithout)}`} />
          <span className="text-[13px] font-bold">{pair.withLabel}</span>
          <Strip values={c.withTag} lo={lo} hi={hi} mean={c.meanWith} dot="bg-warn-btn/55" bar="bg-warn-btn" label={`${pair.withLabel}: ${c.withTag.length} días, media ${format(c.meanWith)}`} />
          <span />
          <div className="flex justify-between text-[11px] font-semibold text-muted">
            <span>{format(lo)}</span>
            <span>{format(hi)}</span>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <span className="flex h-[30px] items-center rounded-[15px] bg-field px-3 text-xs font-bold">
          {c.enough ? `Relación ${c.strength}` : "Insuficiente"}
          {level > 0 ? <span className="sr-only"> ({level} de 3)</span> : null}
        </span>
        <span className="flex h-[30px] items-center rounded-[15px] bg-field px-3 text-xs font-bold">
          {c.withTag.length} vs {c.withoutTag.length} días
        </span>
      </div>
      {c.enough ? (
        <span className="text-xs text-muted">
          Diferencia de medias con d de Cohen {c.d.toLocaleString("es", { maximumFractionDigits: 2, minimumFractionDigits: 2, signDisplay: "always" })} · solo días con check-in
        </span>
      ) : null}
    </section>
  );
}
