"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { pendingCount } from "@/modules/workouts/session";
import { loadActiveSession } from "@/modules/workouts/store";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};
const snapshot = () => {
  try {
    return localStorage.getItem("sft.activeSession");
  } catch {
    return null;
  }
};

/** "Sesión en curso" on top of Rutinas, read from the phone (canvas: C2-Rutinas, sesionEnCurso). */
export function ActiveSessionBanner() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const session = raw ? loadActiveSession() : null;
  if (!session) return null;
  const pending = pendingCount(session);
  return (
    <Link href="/sesion" className="grid max-w-xl grid-cols-[minmax(0,1fr)_20px] items-center gap-2.5 rounded-[20px] bg-nav-on px-4 py-3.5 text-on-nav-on">
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-extrabold">{session.endedAt ? "Sesión terminada" : "Sesión en curso"}: {session.name}</span>
        <span className="text-[13px] font-semibold">
          {session.sets.length} {session.sets.length === 1 ? "serie anotada" : "series anotadas"}
          {pending ? ` · ${pending} esperando señal` : ""}
        </span>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
