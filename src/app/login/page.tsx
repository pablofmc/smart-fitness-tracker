import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-[22px] px-4 py-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div aria-hidden className="flex size-16 items-center justify-center rounded-[20px] bg-hero">
          <svg viewBox="0 0 24 24" className="size-8 fill-none stroke-on-hero" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h4l3-8 4 16 3-8h4" />
          </svg>
        </div>
        <h1 className="text-[26px] font-extrabold">Smart Fitness</h1>
        <p className="text-[15px] text-muted">Tus datos de Garmin, explicados.</p>
      </div>
      <LoginForm />
      <p className="px-3 text-center text-[13px] leading-normal text-muted">App personal. No se pueden crear cuentas nuevas.</p>
    </main>
  );
}
