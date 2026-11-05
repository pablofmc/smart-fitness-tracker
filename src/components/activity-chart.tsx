"use client";

import { scaleLinear } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { useState } from "react";
import type { MetricKey, Series } from "@/lib/activities/fit";

const WIDTH = 326;
const HEIGHT = 150;

const PACE = (minutes: number) => `${Math.floor(minutes)}:${String(Math.round((minutes % 1) * 60)).padStart(2, "0")}`;
const ONE = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const WHOLE = new Intl.NumberFormat("es", { maximumFractionDigits: 0, useGrouping: "always" });

const METRICS: Record<MetricKey, { label: string; summary: (mean: number) => string; value: (v: number) => string; unit: string }> = {
  hr: { label: "FC", summary: (m) => `FC media ${WHOLE.format(m)} lpm`, value: (v) => WHOLE.format(v), unit: "lpm" },
  pace: { label: "Ritmo", summary: (m) => `${PACE(m)} /km medio`, value: PACE, unit: "/km" },
  speed: { label: "Velocidad", summary: (m) => `${ONE.format(m)} km/h media`, value: (v) => ONE.format(v), unit: "km/h" },
  altitude: { label: "Altitud", summary: (m) => `Altitud media ${WHOLE.format(m)} m`, value: (v) => WHOLE.format(v), unit: "m" },
  cadence: { label: "Cadencia", summary: (m) => `${WHOLE.format(m)} ppm media`, value: (v) => WHOLE.format(v), unit: "ppm" },
};

function hours(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, "0")}`;
}

const ORDER = Object.keys(METRICS) as MetricKey[];

/** Why a chart the sport expects is empty. Missing is shown, never drawn as zero. */
const MISSING: Partial<Record<MetricKey, string>> = {
  altitude: "El reloj no grabó altitud, como pasa en cinta o bajo techo.",
};

/**
 * Time chart for each metric the activity recorded (R-ACT-05). Faster pace plots higher.
 * `missing` are charts the sport expects but the file lacks: they keep their tab and say why.
 */
export function ActivityChart({ series, missing = [] }: { series: Series[]; missing?: MetricKey[] }) {
  const [key, setKey] = useState(series[0]?.key);
  const tabs = ORDER.filter((k) => missing.includes(k) || series.some((s) => s.key === k));
  const absent = missing.includes(key) ? key : null;
  const current = series.find((s) => s.key === key) ?? series[0];
  if (!current) return null;

  const tabList =
    tabs.length > 1 ? (
      <div role="tablist" aria-label="Métrica del gráfico" className="grid gap-1 rounded-2xl bg-sunk p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === (absent ?? current.key)}
            onClick={() => setKey(k)}
            className={`h-10 rounded-xl text-[13px] font-bold ${k === (absent ?? current.key) ? "bg-primary text-on-primary" : "text-ink-soft"}`}
          >
            {METRICS[k].label}
          </button>
        ))}
      </div>
    ) : null;

  if (absent) {
    return (
      <div className="flex flex-col gap-3">
        {tabList}
        <span className="text-base font-extrabold">Sin {METRICS[absent].label.toLowerCase()}</span>
        <div className="flex items-center justify-center rounded-2xl bg-sunk px-6 text-center text-sm text-muted" style={{ height: HEIGHT }}>
          {MISSING[absent] ?? "El reloj no grabó este dato en esta actividad."}
        </div>
      </div>
    );
  }

  const meta = METRICS[current.key];
  const values = current.points.map((p) => p.v);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const end = current.points[current.points.length - 1].t;
  const pad = (high - low) * 0.08 || 1;
  const x = scaleLinear({ domain: [0, end || 1], range: [0, WIDTH] });
  const y = scaleLinear({ domain: current.key === "pace" ? [high + pad, low - pad] : [low - pad, high + pad], range: [HEIGHT - 4, 4] });
  const range = current.key === "pace" ? `${meta.value(low)}–${meta.value(high)} ${meta.unit}` : `${meta.value(low)}–${meta.value(high)} ${meta.unit}`;

  return (
    <div className="flex flex-col gap-3">
      {tabList}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base font-extrabold">{meta.summary(mean)}</span>
        <span className="text-xs text-muted">{range}</span>
      </div>
      <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`${meta.label} a lo largo de la actividad`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={WIDTH} y1={HEIGHT * f} y2={HEIGHT * f} className="stroke-field" />
        ))}
        <AreaClosed data={current.points} x={(p) => x(p.t)} y={(p) => y(p.v)} yScale={y} className="fill-primary opacity-10" />
        <LinePath data={current.points} x={(p) => x(p.t)} y={(p) => y(p.v)} className="stroke-primary" strokeWidth={2} fill="none" />
      </svg>
      <div className="flex justify-between text-[11px] font-semibold text-muted">
        {[0, 1 / 3, 2 / 3, 1].map((f) => (
          <span key={f}>{hours(end * f)}</span>
        ))}
      </div>
    </div>
  );
}
