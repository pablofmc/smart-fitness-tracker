"use client";

import { useState, useTransition } from "react";
import { linkSessionToActivity } from "@/app/(app)/sesion/actions";

/** "Which watch activity does my session belong to?" when two overlap it (R-STR-09). The pick sticks. */
export function SessionPicker({ sessionId, title, options }: { sessionId: string; title: string; options: { id: number; label: string; sub: string }[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(id: number) {
    setPicked(id);
    startTransition(async () => {
      const result = await linkSessionToActivity({ sessionId, activityId: id });
      setMessage(result.message ?? null);
      if (result.message) setPicked(null);
    });
  }

  return (
    <section className="flex flex-col gap-1.5 rounded-[20px] bg-card p-4">
      <h2 className="text-base font-extrabold">¿A qué actividad del reloj pertenece tu sesión?</h2>
      <p className="mb-1.5 text-[13px] leading-snug text-muted">{title}</p>
      <ul role="radiogroup" aria-label="Actividades candidatas" className="flex flex-col">
        {options.map((o, i) => {
          const on = picked === o.id;
          return (
            <li key={o.id} className={i ? "border-t border-sunk" : ""}>
              <button type="button" role="radio" aria-checked={on} disabled={pending} onClick={() => pick(o.id)} className="grid min-h-[60px] w-full grid-cols-[minmax(0,1fr)_24px] items-center gap-3 py-2 text-left disabled:opacity-60">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{o.label}</span>
                  <span className="text-xs text-muted">{o.sub}</span>
                </span>
                <span aria-hidden className={`flex size-[22px] items-center justify-center rounded-full border-2 ${on ? "border-primary" : "border-line"}`}>
                  {on && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {message && (
        <p role="alert" className="text-[13px] font-semibold text-warn-text">
          {message}
        </p>
      )}
    </section>
  );
}
