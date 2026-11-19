"use client";

import { useState, useTransition } from "react";
import type { WeightUnit } from "@/lib/units";
import { saveWeightUnit } from "./unit-actions";

const OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: "kg", label: "Kilos (kg)" },
  { value: "lb", label: "Libras (lb)" },
];

/** kg or lb for every weight shown or typed (#66). Distances and paces stay metric. */
export function UnitSection({ unit }: { unit: WeightUnit }) {
  const [current, setCurrent] = useState(unit);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(value: WeightUnit) {
    if (value === current) return;
    const before = current;
    setCurrent(value);
    setMessage(null);
    startTransition(async () => {
      const result = await saveWeightUnit(value);
      if (result.message) {
        setCurrent(before);
        setMessage(result.message);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-[18px]">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[17px] font-extrabold">Unidad de peso</h2>
        <span className="text-[13px] leading-snug text-muted">Para tus series, récords, la calculadora y tu peso del check-in. Distancias y ritmos siguen en km.</span>
      </div>
      <div role="radiogroup" aria-label="Unidad de peso" className="grid grid-cols-2 gap-1 rounded-2xl bg-sunk p-1">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={current === o.value}
            disabled={pending}
            onClick={() => pick(o.value)}
            className={`h-11 rounded-xl text-sm ${current === o.value ? "bg-primary font-extrabold text-on-primary" : "font-bold"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <span className="text-xs leading-snug text-muted">Cambiarla no toca tus datos: todo se guarda en kg y solo cambia cómo se muestra.</span>
      {message ? (
        <p role="alert" className="text-sm font-semibold text-warn">
          {message}
        </p>
      ) : null}
    </section>
  );
}
