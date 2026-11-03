"use client";

import { useActionState, useState } from "react";
import { saveKey, type SaveKeyState } from "./actions";

const initial: SaveKeyState = {};

export function GarminKeyForm({ label, startOpen }: { label: string; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [state, action, pending] = useActionState(async (prev: SaveKeyState, formData: FormData) => {
    const next = await saveKey(prev, formData);
    if (next.saved) setOpen(false);
    return next;
  }, initial);

  if (!open && !startOpen) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 self-start rounded-full bg-primary px-4 text-sm font-extrabold text-on-primary outline-primary focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {label}
      </button>
    );
  }

  const input = "h-11 rounded-xl border border-line bg-card px-3 text-sm font-semibold text-ink outline-none focus:border-primary";

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <label className="flex flex-col gap-2 text-xs font-bold">
        Nueva clave de API
        <input type="password" name="apiKey" required autoComplete="off" spellCheck={false} placeholder="Pega la clave" className={input} />
      </label>
      <label className="flex flex-col gap-2 text-xs font-bold">
        Vence el
        <input type="date" name="expiresOn" required className={input} />
      </label>
      {state.message ? (
        <p role="alert" className="text-sm leading-snug font-semibold text-warn">
          {state.message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-11 flex-1 rounded-full bg-primary px-4 text-sm whitespace-nowrap font-extrabold text-on-primary outline-primary focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar clave"}
        </button>
        {startOpen ? null : (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-11 rounded-full border border-line px-4 text-sm font-bold outline-primary focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
