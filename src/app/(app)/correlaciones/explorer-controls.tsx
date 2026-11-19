"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { MAX_LAG, lagText, type ExplorerOption } from "@/modules/insights/explorer";

const GROUPS: ExplorerOption["group"][] = ["Entrenamiento", "Salud", "Check-in", "Etiquetas"];

function Select({ label, value, options, onChange }: { label: string; value: string; options: ExplorerOption[]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl bg-field px-2.5 text-sm font-bold text-ink">
        {GROUPS.map((g) => {
          const inGroup = options.filter((o) => o.group === g);
          return inGroup.length ? (
            <optgroup key={g} label={g}>
              {inGroup.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>
    </label>
  );
}

/** Puts the choice in the URL, so the server reads only the two series asked for. */
export function ExplorerControls({ options, x, y, lag }: { options: ExplorerOption[]; x: string; y: string; lag: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const set = (key: "x" | "y" | "lag", value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    startTransition(() => router.replace(`${pathname}?${next}#explorador`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <div className="grid grid-cols-2 gap-2.5">
        <Select label="Si cambia…" value={x} options={options} onChange={(v) => set("x", v)} />
        <Select label="…¿cambia?" value={y} options={options.filter((o) => o.group !== "Etiquetas")} onChange={(v) => set("y", v)} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Desfase: {lagText(lag)}</span>
        <div className="flex gap-1.5">
          <button type="button" aria-label="Menos días de desfase" disabled={lag === 0} onClick={() => set("lag", String(lag - 1))} className="size-11 rounded-full bg-field text-lg font-extrabold disabled:opacity-40">
            −
          </button>
          <button type="button" aria-label="Más días de desfase" disabled={lag === MAX_LAG} onClick={() => set("lag", String(lag + 1))} className="size-11 rounded-full bg-field text-lg font-extrabold disabled:opacity-40">
            +
          </button>
        </div>
      </div>
    </div>
  );
}
