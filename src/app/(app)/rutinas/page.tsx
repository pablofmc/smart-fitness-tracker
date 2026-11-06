import type { Metadata } from "next";
import Link from "next/link";
import { ActivityTabs } from "@/components/activity-tabs";
import { OfflineWarmup } from "@/components/offline-warmup";
import { createClient } from "@/lib/supabase/server";
import { ActiveSessionBanner } from "./active-session-banner";

export const metadata: Metadata = { title: "Rutinas" };

const IMG = "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4";
const PDF = "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4";

/** The routine library (R-STR-07) and where a session starts (R-STR-08), canvas: C2-Rutinas. */
export default async function RutinasPage() {
  const db = await createClient();
  const { data } = await db.from("routines").select("id, name, file_type, routine_exercises(position, name)").order("updated_at", { ascending: false });
  const routines = (data ?? []).map((r) => {
    const names = [...r.routine_exercises].sort((a, b) => a.position - b.position).map((e) => e.name);
    return { ...r, count: names.length, list: names.join(", ") };
  });

  return (
    <div className="flex flex-col gap-3.5">
      <ActivityTabs current="rutinas" />
      <div className="flex max-w-xl items-center justify-between">
        <h1 className="text-[28px] font-extrabold">Rutinas</h1>
        <Link href="/rutinas/nueva" className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[15px] font-extrabold text-on-primary">
          <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current" strokeWidth={2.4} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva
        </Link>
      </div>

      <ActiveSessionBanner />
      {/* Session pages kept on the phone, so a session opens in the gym without signal. */}
      <OfflineWarmup urls={["/sesion", ...routines.map((r) => `/sesion?rutina=${r.id}`)]} />

      {routines.length === 0 ? (
        <p className="max-w-xl rounded-[20px] bg-card px-[18px] py-6 text-center text-[15px] leading-snug text-muted">Sube la foto o el PDF de una rutina y la IA te propone sus ejercicios. También puedes escribirlos a mano.</p>
      ) : (
        <ul className="flex max-w-xl flex-col gap-3.5">
          {routines.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-[20px] bg-card px-4 pt-3.5 pb-4">
              <Link href={`/rutinas/${r.id}`} className="grid grid-cols-[56px_minmax(0,1fr)_20px] items-center gap-3.5">
                <span aria-hidden className="flex h-[70px] w-14 flex-col items-center justify-center gap-1 rounded-[10px] bg-sunk text-muted">
                  <svg viewBox="0 0 24 24" className="size-[26px] fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d={r.file_type === "application/pdf" ? PDF : IMG} />
                  </svg>
                  <span className="text-[10px] font-extrabold tracking-wide">{r.file_type ? (r.file_type === "application/pdf" ? "PDF" : "FOTO") : "A MANO"}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[17px] font-extrabold">{r.name}</span>
                  <span className="text-[13px] text-muted">{r.count === 0 ? "Sin ejercicios todavía" : `${r.count} ${r.count === 1 ? "ejercicio" : "ejercicios"}`}</span>
                  {r.list && <span className="truncate text-[13px] text-ink-soft">{r.list}</span>}
                </span>
                <svg viewBox="0 0 24 24" aria-label="Editar" className="size-5 fill-none stroke-current text-muted" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
              <Link href={`/sesion?rutina=${r.id}`} className="flex h-11 items-center justify-center rounded-[14px] bg-primary text-sm font-extrabold text-on-primary">
                Hoy hago esta rutina
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/sesion" className="flex max-w-xl items-center justify-center gap-2 rounded-[20px] border border-dashed border-line p-4 text-[15px] font-bold">
        <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8l6 4-6 4z" />
        </svg>
        Empezar sesión sin rutina
      </Link>

      <p className="max-w-xl text-xs leading-snug text-muted">Las rutinas se leen con IA solo cuando lo pides al subirlas. Ajustes muestra cuántas lecturas van este mes.</p>
    </div>
  );
}
