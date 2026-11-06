"use client";

import { useRef, useState, useTransition } from "react";
import { setRunShoe } from "@/app/(app)/equipo/actions";
import { ShoeImage } from "./shoe-image";

export type PickerShoe = { id: number; name: string; image: string | null; sub: string };

const KM = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

export function RunShoePicker({ activityId, distanceKm, current, options }: { activityId: number; distanceKm: number | null; current: PickerShoe | null; options: PickerShoe[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const km = distanceKm ? `Los ${KM.format(distanceKm)} km` : "La carrera";

  function pick(next: PickerShoe | null) {
    dialog.current?.close();
    if ((next?.id ?? null) === (current?.id ?? null)) return;
    startTransition(async () => {
      const result = await setRunShoe({ activityId, shoeId: next?.id ?? null });
      if (result.message) return setNotice({ text: result.message, error: true });
      if (!next) setNotice({ text: `${km} se quitaron de ${current?.name}.` });
      else if (!current) setNotice({ text: `${km} se sumaron a ${next.name}.` });
      else setNotice({ text: `${km} pasaron de ${current.name} a ${next.name}.` });
    });
  }

  const choices: (PickerShoe | null)[] = [...options, null];

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        disabled={pending}
        className="grid grid-cols-[64px_minmax(0,1fr)_20px] items-center gap-3 rounded-[20px] bg-card px-3.5 py-3 text-left outline-primary focus-visible:outline-2 disabled:opacity-60"
      >
        <ShoeImage src={current?.image ?? null} className="h-[46px] w-16" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-bold text-muted">Zapatilla</span>
          <span className="text-base font-extrabold">{pending ? "Guardando…" : (current?.name ?? "Sin zapatilla")}</span>
        </span>
        <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current text-muted" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {notice && (
        <p role="status" className={`rounded-[14px] px-3.5 py-3 text-sm font-bold ${notice.error ? "bg-warn-bg text-warn-text" : "bg-nav-on text-on-nav-on"}`}>
          {notice.text}
        </p>
      )}

      <dialog
        ref={dialog}
        aria-label="Elegir zapatilla"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-card p-0 text-ink backdrop:bg-black/50 md:m-auto md:max-w-md md:rounded-3xl"
      >
        <div className="flex flex-col gap-1.5 px-4 pt-2.5 pb-6">
          <span aria-hidden className="h-[5px] w-10 self-center rounded-full bg-line md:hidden" />
          <h2 className="mt-2 text-lg font-extrabold">¿Con qué zapatilla corriste?</h2>
          <p className="mb-1.5 text-[13px] leading-snug text-muted">Al cambiarla, {distanceKm ? `los ${KM.format(distanceKm)} km pasan` : "la carrera pasa"} a la zapatilla que elijas.</p>
          <ul role="radiogroup" aria-label="Zapatillas activas" className="flex flex-col">
            {choices.map((shoe, i) => {
              const on = (shoe?.id ?? null) === (current?.id ?? null);
              return (
                <li key={shoe?.id ?? "none"} className={i ? "border-t border-sunk" : ""}>
                  <button type="button" role="radio" aria-checked={on} onClick={() => pick(shoe)} className="grid min-h-[60px] w-full grid-cols-[56px_minmax(0,1fr)_24px] items-center gap-3 py-2 text-left">
                    {shoe ? (
                      <ShoeImage src={shoe.image} className="h-10 w-14" />
                    ) : (
                      <span className="flex h-10 w-14 items-center justify-center rounded-xl bg-sunk text-muted">
                        <svg viewBox="0 0 24 24" aria-hidden className="size-[22px] fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
                          <circle cx="12" cy="12" r="8" />
                          <path d="M6.5 17.5l11-11" />
                        </svg>
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{shoe?.name ?? "Sin zapatilla"}</span>
                      <span className="text-xs text-muted">{shoe?.sub ?? "No suma km a ninguna"}</span>
                    </span>
                    <span aria-hidden className={`flex size-[22px] items-center justify-center rounded-full border-2 ${on ? "border-primary" : "border-line"}`}>
                      {on && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <span className="pt-1 text-xs leading-snug text-muted">Las retiradas no aparecen: ya no reciben carreras.</span>
        </div>
      </dialog>
    </>
  );
}
