import type { DayValue } from "@/lib/metrics/baseline";
import { compareTag, correlate, pairByDay } from "@/lib/metrics/correlation";
import { TAG_PREFIX, explorerSentence, formatValue, inSentence, isTag, lagText, trendLine, type ExplorerChoice, type ExplorerOption } from "@/modules/insights/explorer";
import { ExplorerControls } from "./explorer-controls";
import { TagCard } from "./tag-card";

const W = 326;
const H = 170;
const PAD = 6;

/** Any metric against any other, or a tag against a metric, with a day lag (R-COR-03, R-COR-04). */
export function Explorer({ choice, options, xs, ys, checkins }: { choice: ExplorerChoice; options: ExplorerOption[]; xs: DayValue[]; ys: DayValue[]; checkins: { day: string; tags: string[] }[] }) {
  const { x, y, lag } = choice;
  const controls = <ExplorerControls options={options} x={x.key} y={y.key} lag={lag} />;

  if (isTag(x.key)) {
    const tag = x.key.slice(TAG_PREFIX.length);
    const c = compareTag(checkins, tag, ys, lag);
    return (
      <>
        <section id="explorador" className="flex scroll-mt-4 flex-col gap-3 rounded-[24px] bg-card p-[18px]">
          <h2 className="text-[17px] font-extrabold">Explorador</h2>
          {controls}
        </section>
        <TagCard
          pair={{ tag, metric: y.key, lag, title: `${tag} → ${y.label} ${lagText(lag)}`, lead: `Los días con «${tag}»`, subject: inSentence(y.label), withLabel: `Con ${inSentence(tag)}`, withoutLabel: `Sin ${inSentence(tag)}` }}
          c={c}
          unit={y.unit}
          format={(v) => formatValue(v, y.unit)}
        />
      </>
    );
  }

  const c = correlate(xs, ys, lag);
  const pairs = pairByDay(xs, ys, lag);
  const bounds = (vals: number[]) => {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return { lo, hi, span: hi - lo || 1 };
  };
  const bx = bounds(pairs.map((p) => p.x));
  const by = bounds(pairs.map((p) => p.y));
  const px = (v: number) => PAD + ((v - bx.lo) / bx.span) * (W - 2 * PAD);
  const py = (v: number) => H - PAD - ((v - by.lo) / by.span) * (H - 2 * PAD);
  const line = c.enough ? trendLine(pairs) : null;

  return (
    <section id="explorador" className="flex scroll-mt-4 flex-col gap-3 rounded-[24px] bg-card p-[18px]">
      <h2 className="text-[17px] font-extrabold">Explorador</h2>
      {controls}
      {pairs.length ? (
        <>
          <div className="flex flex-col gap-1">
            {/* Dots as positioned elements so they stay round at any width; the line stretches. */}
            <div className="relative h-[170px] border-b border-l border-field" role="img" aria-label={`Dispersión de ${inSentence(x.label)} contra ${inSentence(y.label)} ${lagText(lag)}, ${pairs.length} días`}>
              {pairs.map((p, i) => (
                <span key={i} className="absolute size-1.5 -translate-1/2 rounded-full bg-primary/35" style={{ left: `${(px(p.x) / W) * 100}%`, top: py(p.y) }} />
              ))}
              {line ? (
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
                  <line x1={px(bx.lo)} y1={py(line.slope * bx.lo + line.intercept)} x2={px(bx.hi)} y2={py(line.slope * bx.hi + line.intercept)} className="stroke-primary" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
              ) : null}
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-muted">
              <span>
                {x.label}: {formatValue(bx.lo, x.unit)}
              </span>
              <span>{formatValue(bx.hi, x.unit)}</span>
            </div>
            <span className="text-[11px] font-semibold text-muted">
              {y.label} de {formatValue(by.lo, y.unit)} (abajo) a {formatValue(by.hi, y.unit)} (arriba)
            </span>
          </div>
        </>
      ) : null}
      <span className={`text-[15px] leading-snug ${c.enough ? "" : "text-muted"}`}>{explorerSentence(choice, c)}</span>
      {c.enough ? (
        <span className="text-xs text-muted">
          Spearman ρ {c.rho.toLocaleString("es", { maximumFractionDigits: 2, minimumFractionDigits: 2, signDisplay: "always" })} con {c.n.toLocaleString("es")} días emparejados
        </span>
      ) : null}
    </section>
  );
}
