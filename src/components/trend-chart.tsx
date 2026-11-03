import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";

const WIDTH = 326;
const HEIGHT = 120;

/** A dense line with dots for each week, month or year (direction B inside C's card, R-UI-06). */
export function TrendChart({ points, label, invert = false }: { points: { mean: number }[]; label: string; invert?: boolean }) {
  if (points.length === 0) return null;
  const values = points.map((p) => p.mean);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = (high - low) * 0.1 || 1;
  const x = scaleLinear({ domain: [0, Math.max(1, points.length - 1)], range: [6, WIDTH - 6] });
  const y = scaleLinear({ domain: invert ? [high + pad, low - pad] : [low - pad, high + pad], range: [HEIGHT - 6, 6] });
  return (
    <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={label}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} x2={WIDTH} y1={HEIGHT * f} y2={HEIGHT * f} className="stroke-field" />
      ))}
      <LinePath data={points} x={(_, i) => x(i)} y={(p) => y(p.mean)} className="stroke-primary" strokeWidth={2} fill="none" />
      {points.length <= 60 ? points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.mean)} r={2.2} className="fill-primary" />) : null}
    </svg>
  );
}
