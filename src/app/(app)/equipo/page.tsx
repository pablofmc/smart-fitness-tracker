import type { Metadata } from "next";
import Link from "next/link";
import { readShoes } from "@/modules/gear/read";
import { ShoeImage } from "@/modules/gear/shoe-image";
import { requireSession } from "@/lib/supabase/auth";
import { ShoeCard } from "./shoe-card";

export const metadata: Metadata = { title: "Equipo" };

const KM = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const day = (iso: string) => DATE.format(new Date(`${iso}T00:00:00Z`)).replaceAll(".", "");

/** Active shoes with their km against the limit, and the retired ones with their final km (R-GEAR-02, R-GEAR-04). */
export default async function EquipoPage() {
  await requireSession();
  const shoes = await readShoes();
  const active = shoes.filter((s) => !s.retiredOn);
  const retired = shoes.filter((s) => s.retiredOn).sort((a, b) => b.retiredOn!.localeCompare(a.retiredOn!));
  const defaultShoe = active.find((s) => s.isDefault);

  return (
    <div className="flex max-w-xl flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold">Equipo</h1>
        <Link href="/equipo/nueva" className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[15px] font-extrabold text-on-primary">
          <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current" strokeWidth={2.4} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Añadir
        </Link>
      </div>

      {active.length === 0 ? (
        <p className="rounded-[20px] bg-card px-[18px] py-6 text-center text-[15px] leading-snug text-muted">
          {retired.length ? "No tienes zapatillas activas. Las carreras nuevas quedan sin zapatilla hasta que añadas una." : "Todavía no tienes zapatillas. Añade la primera para llevar sus km."}
        </p>
      ) : (
        <>
          <p className="-mt-1.5 text-sm text-muted">
            {active.length} {active.length === 1 ? "zapatilla activa" : "zapatillas activas"}
            {defaultShoe ? ` · carreras nuevas a ${defaultShoe.name}` : " · sin predeterminada: las carreras nuevas quedan sin zapatilla"}
          </p>
          {active.map((s) => (
            <ShoeCard
              key={s.id}
              shoe={{
                id: s.id,
                name: s.name,
                image: s.image,
                runTypes: s.runTypes,
                km: s.km,
                limitKm: s.limitKm,
                percent: s.percent,
                warn: s.warn,
                leftKm: s.leftKm,
                runs: s.runs,
                since: day(s.startedOn),
                isDefault: s.isDefault,
              }}
            />
          ))}
        </>
      )}

      {retired.length > 0 && (
        <details className="group flex flex-col gap-2 pt-1" open>
          <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-0.5 text-[15px] font-extrabold">
            Retiradas ({retired.length})
            <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current transition-transform group-open:rotate-180" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <ul className="mt-2 rounded-[20px] bg-card px-4 py-1">
            {retired.map((s, i) => (
              <li key={s.id} className={`grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 py-3 ${i ? "border-t border-sunk" : ""}`}>
                <ShoeImage src={s.image} className="h-10 w-14 rounded-[10px] opacity-80" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{s.name}</span>
                  <span className="text-[13px] text-muted">
                    Retirada el {day(s.retiredOn!)} · {s.runs} {s.runs === 1 ? "carrera" : "carreras"}
                  </span>
                </div>
                <span className="text-[15px] font-extrabold tabular-nums">{KM.format(s.km)} km</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs leading-snug text-muted">Km = km iniciales + carreras asignadas. La zapatilla predeterminada recibe cada carrera nueva que llega de Garmin.</p>
    </div>
  );
}
