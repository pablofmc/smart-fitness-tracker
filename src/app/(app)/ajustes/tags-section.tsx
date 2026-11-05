"use client";

import { useState, useTransition } from "react";
import { addCheckinTag, removeCheckinTag } from "@/app/(app)/checkin-actions";

/** The check-in's tags (design canvas, C2-Ajustes). Removing one keeps it in past check-ins. */
export function TagsSection({ tags }: { tags: string[] }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ message?: string }>) =>
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (!result.message) {
        setName("");
        setAdding(false);
      }
    });

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-[18px]">
      <h2 className="text-[17px] font-extrabold">Etiquetas del check-in</h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="flex h-9 items-center gap-1.5 rounded-full bg-sunk pr-1.5 pl-3.5 text-[13px] font-semibold">
            {tag}
            <button type="button" aria-label={`Quitar ${tag}`} disabled={pending} onClick={() => run(() => removeCheckinTag(tag))} className="size-7 rounded-full font-extrabold text-muted">
              ×
            </button>
          </span>
        ))}
        {adding ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addCheckinTag(name));
            }}
          >
            <label className="sr-only" htmlFor="new-tag">
              Nueva etiqueta
            </label>
            <input id="new-tag" autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="h-9 w-36 rounded-full border border-line bg-field px-3 text-[13px]" />
            <button type="submit" disabled={pending} className="h-9 rounded-full bg-primary px-3.5 text-[13px] font-bold text-on-primary">
              Añadir
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="h-9 rounded-full border border-dashed border-line px-3.5 text-[13px] font-bold">
            + Nueva
          </button>
        )}
      </div>
      {message ? (
        <p role="alert" className="text-sm font-semibold text-warn">
          {message}
        </p>
      ) : null}
    </section>
  );
}
