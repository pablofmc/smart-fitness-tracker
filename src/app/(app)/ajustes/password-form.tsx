"use client";

import { startTransition, useActionState, useRef } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/account/password";
import { changePassword, type PasswordState } from "./password-actions";

const initial: PasswordState = {};
const input = "h-12 rounded-xl border border-line bg-card px-3 text-base font-semibold text-ink outline-none focus:border-primary aria-invalid:border-warn";

/** Ajustes › Cuenta › Cambiar contraseña (canvas: C2-Cambiar-Clave). */
export function PasswordForm() {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: PasswordState, data: FormData) => {
    const next = await changePassword(prev, data);
    if (next.saved) form.current?.reset();
    return next;
  }, initial);
  const wrongCurrent = state.message === "La contraseña actual no es correcta.";

  return (
    // onSubmit rather than action={…}: a form action clears every field, even after a wrong current password.
    <form
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-3"
    >
      <h3 className="text-[15px] font-extrabold">Cambiar contraseña</h3>
      {state.saved ? (
        <p role="status" className="rounded-[14px] bg-nav-on px-3.5 py-3 text-sm font-bold text-on-nav-on">
          Contraseña cambiada.
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Contraseña actual
        <input type="password" name="current" required autoComplete="current-password" aria-invalid={wrongCurrent || undefined} className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Nueva contraseña
        <input type="password" name="next" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Repite la nueva
        <input type="password" name="repeat" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={input} />
      </label>
      <span className="text-[13px] text-muted">Al menos {MIN_PASSWORD_LENGTH} caracteres.</span>
      {state.message ? (
        <p role="alert" className="text-sm leading-snug font-semibold text-warn">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-[14px] bg-primary text-[15px] font-extrabold text-on-primary outline-primary focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
