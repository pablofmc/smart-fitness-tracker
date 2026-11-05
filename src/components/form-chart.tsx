"use client";

import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import type { FormDay } from "@/lib/metrics/form";

const WIDTH = 326;
const HEIGHT = 140;

/** Fitness (CTL) and fatigue (ATL) as lines, form (TSB) as bars around zero (design canvas, C2-Tendencias). */
export function FormChart({ days }: { days: FormDay[] }) {
  if (days.length < 2) return null;
  const high = Math.max(1, ...days.map((d) => Math.max(d.ctl, d.atl)));
  const tsbRange = Math.max(1, ...days.map((d) => Math.abs(d.tsb)));
  const x = scaleLinear({ domain: [0, days.length - 1], range: [0, WIDTH] });
  const y = scaleLinear({ domain: [0, high * 1.05], range: [HEIGHT - 4, 4] });
  const zero = HEIGHT * 0.75;
  const barScale = (HEIGHT * 0.25) / tsbRange;
  const step = WIDTH / days.length;

  return (
    <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label="Curvas de forma (CTL) y fatiga (ATL), con la frescura (TSB) en barras">
      <line x1={0} x2={WIDTH} y1={zero} y2={zero} className="stroke-field" />
      {days.map((d, i) => {
        const h = Math.abs(d.tsb) * barScale;
        return <rect key={d.day} x={i * step} width={Math.max(0.5, step * 0.7)} y={d.tsb >= 0 ? zero - h : zero} height={h} className={d.tsb >= 0 ? "fill-nav-on" : "fill-amber-bg"} />;
      })}
      <LinePath data={days} x={(_, i) => x(i)} y={(d) => y(d.ctl)} className="stroke-primary" strokeWidth={2.2} fill="none" />
      <LinePath data={days} x={(_, i) => x(i)} y={(d) => y(d.atl)} className="stroke-warn-line" strokeWidth={1.6} strokeDasharray="4 3" fill="none" />
    </svg>
  );
}
