"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  const input = "h-12 rounded-[14px] border-2 bg-sunk px-3.5 text-base font-semibold text-ink outline-none focus:border-primary";

  return (
    <form action={action} className="flex flex-col gap-3.5 rounded-3xl bg-card p-5">
      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-muted">
        Correo
        <input type="email" name="email" required autoComplete="email" inputMode="email" defaultValue={state.email} className={`${input} border-field`} />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-muted">
        Contraseña
        <input type="password" name="password" required autoComplete="current-password" className={`${input} ${state.message ? "border-warn-line" : "border-field"}`} />
      </label>
      {state.message ? (
        <p role="alert" className="rounded-[14px] bg-warn-bg px-3.5 py-3 text-sm leading-snug font-semibold text-warn">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-[52px] rounded-full bg-primary text-base font-extrabold text-on-primary outline-primary focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
