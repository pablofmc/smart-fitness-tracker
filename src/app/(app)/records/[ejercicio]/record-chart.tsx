"use client";

import { useState } from "react";
import { formatWeight, weightNumber, type WeightUnit } from "@/lib/units";
import { shortDay } from "../format";

type Point = { day: string; kg: number; reps: number; e1rm: number | null };
type Mode = "peso" | "1rm";

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;

/** Each session's best and the record line that steps up with every new record (canvas: C2-Record-Ejercicio). */
export function RecordChart({ points, name, unit }: { points: Point[]; name: string; unit: WeightUnit }) {
  const hasE1rm = points.some((p) => p.e1rm !== null);
  const [mode, setMode] = useState<Mode>("peso");
  const series = points.flatMap((p) => {
    const v = mode === "peso" ? p.kg : p.e1rm;
    return v === null ? [] : [{ day: p.day, value: v }];
  });

  // The record line: the running best, stepping up on each new record; the first session is the start.
  const records: typeof series = [];
  for (const p of series) if (!records.length || p.value > records.at(-1)!.value) records.push(p);

  const d0 = dayNumber(series[0].day);
  const span = dayNumber(series.at(-1)!.day) - d0;
  const values = series.map((p) => p.value);
  const pad = Math.max(2.5, (Math.max(...values) - Math.min(...values)) * 0.15);
  const lo = Math.min(...values) - pad;
  const hi = Math.max(...values) + pad;
  const x = (day: string) => (span === 0 ? 50 : 3 + ((dayNumber(day) - d0) / span) * 86);
  const y = (v: number) => 92 - ((v - lo) / (hi - lo)) * 84;

  const step: string[] = [];
  records.forEach((r, i) => {
    if (i) step.push(`${x(r.day)},${y(records[i - 1].value)}`);
    step.push(`${x(r.day)},${y(r.value)}`);
  });
  step.push(`${x(series.at(-1)!.day)},${y(records.at(-1)!.value)}`);

  const what = mode === "peso" ? "Peso máximo" : "1RM estimado";
  const first = series[0].value;
  const best = records.at(-1)!.value;
  const tab = (value: Mode, text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setMode(value)}
      disabled={value === "1rm" && !hasE1rm}
      className={`h-10 rounded-xl text-sm disabled:opacity-50 ${mode === value ? "bg-primary font-extrabold text-on-primary" : "font-bold"}`}
    >
      {text}
    </button>
  );

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-4">
      <div role="tablist" aria-label="Qué récord ver" className="grid grid-cols-2 gap-1 rounded-2xl bg-sunk p-1">
        {tab("peso", "Peso máximo")}
        {tab("1rm", "1RM estimado")}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-extrabold tabular-nums">
          {what}: {first === best ? `${formatWeight(best, unit)}` : `${weightNumber(first, unit)} → ${formatWeight(best, unit)}`}
        </span>
        <span className="shrink-0 text-xs text-muted">{series.length > 1 ? `${shortDay(series[0].day)} – ${shortDay(series.at(-1)!.day)}` : shortDay(series[0].day)}</span>
      </div>
      <div
        className="relative h-40 border-b border-field"
        role="img"
        aria-label={`${what} de ${name} por sesión y récords, de ${weightNumber(first, unit)} a ${formatWeight(best, unit)}, ${series.length} ${series.length === 1 ? "sesión" : "sesiones"}`}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full">
          {[8, 50, 92].map((g) => (
            <line key={g} x1="0" x2="100" y1={g} y2={g} className="stroke-field" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <polyline points={step.join(" ")} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {series.map((p) => (
          <span key={`s-${p.day}`} className="absolute size-1.5 -translate-1/2 rounded-full bg-line" style={{ left: `${x(p.day)}%`, top: `${y(p.value)}%` }} title={`${shortDay(p.day)}: ${formatWeight(p.value, unit)}`} />
        ))}
        {records.slice(1).map((r) => (
          <span key={`r-${r.day}`} className="absolute size-3 -translate-1/2 rounded-full border-2 border-card bg-amber-btn" style={{ left: `${x(r.day)}%`, top: `${y(r.value)}%` }} title={`Récord el ${shortDay(r.day)}: ${formatWeight(r.value, unit)}`} />
        ))}
        <span className="absolute top-0 right-0 text-[11px] text-muted tabular-nums">{formatWeight(Math.round(hi), unit)}</span>
        <span className="absolute right-0 bottom-0.5 text-[11px] text-muted tabular-nums">{formatWeight(Math.round(lo), unit)}</span>
      </div>
      <div className="flex gap-3.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-btn" />
          Récord
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-line" />
          {mode === "peso" ? "Serie más pesada de cada sesión" : "1RM de cada sesión"}
        </span>
      </div>
    </section>
  );
}
