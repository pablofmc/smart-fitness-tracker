"use client";

import { useState, useTransition } from "react";
import { saveCheckin } from "@/app/(app)/checkin-actions";

const FEELINGS = ["Fatal", "Mal", "Normal", "Bien", "Genial"];

type Saved = { feel: number | null; tags: string[]; weightKg: number | null; note: string | null };

/** One tap per answer, saved as you go, so it fits in ten seconds with one hand (R-CHK-01). */
export function Checkin({ day, tags, saved }: { day: string; tags: string[]; saved: Saved | null }) {
  const [state, setState] = useState<Saved>(saved ?? { feel: null, tags: [], weightKg: null, note: null });
  const [more, setMore] = useState(Boolean(saved?.weightKg || saved?.note));
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const save = (next: Saved) => {
    setState(next);
    startTransition(async () => setMessage((await saveCheckin({ day, ...next })).message));
  };

  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-card p-[18px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-extrabold">¿Cómo amaneciste?</h2>
        <span className="text-xs text-muted" aria-live="polite">
          {pending ? "Guardando…" : state.feel ? "Guardado" : ""}
        </span>
      </div>
      <div role="radiogroup" aria-label="Cómo te sientes" className="grid grid-cols-5 gap-1.5">
        {FEELINGS.map((label, i) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={state.feel === i + 1}
            onClick={() => save({ ...state, feel: i + 1 })}
            className={`h-12 rounded-[14px] text-[13px] font-bold ${state.feel === i + 1 ? "bg-primary text-on-primary" : "bg-sunk"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const on = state.tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => save({ ...state, tags: on ? state.tags.filter((t) => t !== tag) : [...state.tags, tag] })}
              className={`h-9 rounded-full px-3.5 text-[13px] font-semibold ${on ? "bg-nav-on text-on-nav-on" : "bg-sunk text-ink-soft"}`}
            >
              {tag}
            </button>
          );
        })}
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="h-9 rounded-full px-3.5 text-[13px] font-semibold text-muted">
          {more ? "Menos" : "Peso y nota"}
        </button>
      </div>
      {more ? (
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between gap-3 text-sm font-bold">
            Peso (kg)
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="20"
              max="300"
              defaultValue={state.weightKg ?? ""}
              onBlur={(e) => save({ ...state, weightKg: e.target.value ? Number(e.target.value) : null })}
              className="h-11 w-28 rounded-xl border border-line bg-field px-3 text-right font-semibold"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Nota
            <textarea
              defaultValue={state.note ?? ""}
              maxLength={500}
              rows={2}
              onBlur={(e) => save({ ...state, note: e.target.value || null })}
              className="rounded-xl border border-line bg-field p-3 font-normal"
            />
          </label>
        </div>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm font-semibold text-warn">
          {message}
        </p>
      ) : null}
    </section>
  );
}
