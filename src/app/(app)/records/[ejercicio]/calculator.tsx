"use client";

import { useState } from "react";
import { percentLoad, platesPerSide, repsAt } from "@/lib/metrics/strength";
import { formatInUnit, LOAD_SPEC, toUnit, type WeightUnit } from "@/lib/units";

const CHIPS = [60, 70, 75, 80, 85, 90];
const MIN_PCT = 40;
const MAX_PCT = 100;
// Plate colors by size within each unit's set, the same in light and dark; small plates stay neutral.
const BIG = [
  { height: 56, width: 16, background: "#b91c1c", color: "#ffffff" },
  { height: 52, width: 16, background: "#1d4ed8", color: "#ffffff" },
  { height: 46, width: 16, background: "#a16207", color: "#ffffff" },
  { height: 40, width: 16, background: "#15803d", color: "#ffffff" },
];
const SMALL = [32, 26, 22].map((height) => ({ height, width: 12, background: "var(--line)", color: "var(--ink)" }));
const plateStyle = (unit: WeightUnit, plate: number) => {
  const i = LOAD_SPEC[unit].plates.indexOf(plate);
  return i < BIG.length ? BIG[i] : SMALL[Math.min(SMALL.length - 1, i - BIG.length)];
};

/** Weight for a percentage of a record, rounded to the unit's step, with plates per side (#64, canvas: C2-Record-Ejercicio). */
export function Calculator({ e1rm: e1rmKg, heaviest: heaviestKg, unit }: { e1rm: number | null; heaviest: number; unit: WeightUnit }) {
  // Everything below is in the unit shown (#66); records arrive in kg.
  const spec = LOAD_SPEC[unit];
  const e1rm = e1rmKg === null ? null : toUnit(e1rmKg, unit);
  const heaviest = toUnit(heaviestKg, unit);
  const W = { format: (v: number) => formatInUnit(v, unit) };
  const [base, setBase] = useState<"1rm" | "max">(e1rm ? "1rm" : "max");
  const [pct, setPct] = useState(70);
  const baseKg = base === "1rm" && e1rm ? e1rm : heaviest;
  const { exact, target } = percentLoad(baseKg, pct, spec);
  const plates = platesPerSide(target, spec);
  const platesText = plates.length ? `${plates.map((p) => W.format(p)).join(" + ")} ${unit} por lado` : "Solo la barra";
  const reps = e1rm ? repsAt(target, e1rm) : null;

  let hint: string;
  if (reps === null) hint = "Sin 1RM estimado: tus series de este ejercicio tienen más de 10 reps, así que no hay cuenta de reps.";
  else if (target >= e1rm!) hint = `A ${W.format(target)} ${unit} estás en tu 1RM estimado o por encima: una sola rep.`;
  else if (reps > 10) hint = `A ${W.format(target)} ${unit} podrías hacer más de 10 reps, fuera del rango de la fórmula.`;
  else if (reps >= 4) hint = `A ${W.format(target)} ${unit} podrías hacer hasta unas ${reps} reps. Para series de trabajo, quédate 2 o 3 por debajo: ${reps - 3}–${reps - 2} reps.`;
  else hint = `A ${W.format(target)} ${unit} podrías hacer hasta unas ${reps} ${reps === 1 ? "rep" : "reps"}.`;

  const tab = (value: "1rm" | "max", text: string, disabled = false) => (
    <button
      type="button"
      role="tab"
      aria-selected={base === value}
      disabled={disabled}
      onClick={() => setBase(value)}
      className={`h-10 rounded-xl text-[13px] disabled:opacity-50 ${base === value ? "bg-primary font-extrabold text-on-primary" : "font-bold"}`}
    >
      {text}
    </button>
  );

  return (
    <section className="flex flex-col gap-3.5 rounded-3xl bg-card p-[18px]">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[17px] font-extrabold">Calculadora</h2>
        <span className="text-[13px] text-muted">Qué peso poner para entrenar a un porcentaje de tu récord</span>
      </div>
      <div role="tablist" aria-label="Porcentaje de" className="grid grid-cols-2 gap-1 rounded-2xl bg-sunk p-1">
        {tab("1rm", e1rm ? `1RM estimado · ${W.format(e1rm)}` : "1RM estimado · —", !e1rm)}
        {tab("max", `Peso máximo · ${W.format(heaviest)}`)}
      </div>
      <div className="flex items-center justify-between gap-2.5">
        <button type="button" aria-label="Bajar 5 %" disabled={pct <= MIN_PCT} onClick={() => setPct(Math.max(MIN_PCT, pct - 5))} className="size-12 rounded-full bg-sunk text-[22px] font-extrabold disabled:opacity-40">
          −
        </button>
        <div className="flex flex-col items-center gap-0.5" aria-live="polite">
          <span className="text-[13px] font-bold text-muted">
            {pct} % de {W.format(baseKg)} {unit}
          </span>
          <span className="text-[44px] leading-[1.05] font-extrabold tabular-nums">{W.format(target)} {unit}</span>
          <span className="text-xs text-muted">{exact === target ? "exacto" : target === spec.bar && exact < spec.bar ? `exacto ${W.format(exact)} ${unit}: no baja de la barra` : `exacto ${W.format(exact)} ${unit}, redondeado`}</span>
        </div>
        <button type="button" aria-label="Subir 5 %" disabled={pct >= MAX_PCT} onClick={() => setPct(Math.min(MAX_PCT, pct + 5))} className="size-12 rounded-full bg-sunk text-[22px] font-extrabold disabled:opacity-40">
          +
        </button>
      </div>
      <div role="group" aria-label="Porcentajes comunes" className="grid grid-cols-6 gap-1.5">
        {CHIPS.map((p) => (
          <button key={p} type="button" aria-pressed={pct === p} onClick={() => setPct(p)} className={`h-10 rounded-xl text-[13px] font-bold ${pct === p ? "bg-primary text-on-primary" : "bg-sunk"}`}>
            {p}%
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-2xl bg-sunk px-3.5 py-3">
        <span className="text-xs font-extrabold text-muted">DISCOS POR LADO · BARRA DE {spec.bar} {unit.toUpperCase()}</span>
        <div role="img" aria-label={plates.length ? `Por lado: ${plates.map((p) => W.format(p)).join(", ")} ${unit}` : "Solo la barra"} className="flex h-14 items-center gap-1">
          <div className="h-2 w-9 rounded-sm bg-muted" />
          {plates.map((p, i) => (
            <div key={i} className="flex items-center justify-center rounded-[3px] [writing-mode:vertical-rl]" style={plateStyle(unit, p)}>
              <span className="text-[10px] font-extrabold">{W.format(p)}</span>
            </div>
          ))}
          <div className="h-2 w-5 rounded-sm bg-muted" />
        </div>
        <span className="text-sm font-bold">{platesText}</span>
      </div>
      <span className="text-sm leading-normal">{hint}</span>
      <span className="text-xs leading-snug text-muted">{unit === "lb" ? "Se redondea a 5 lb, el salto más chico con discos de 2,5 lb." : "Se redondea a 2,5 kg, el salto más chico con discos de 1,25."} Las reps salen de la misma fórmula de Epley que tu 1RM: son una guía, no un límite.</span>
    </section>
  );
}
