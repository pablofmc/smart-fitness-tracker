"use client";

import { useState, useTransition } from "react";
import { RUN_TYPE_LABELS, type RunType } from "@/modules/gear/catalog";
import { ShoeImage } from "@/modules/gear/shoe-image";
import { makeDefaultShoe, retireShoe } from "./actions";

export type CardShoe = {
  id: number;
  name: string;
  image: string | null;
  runTypes: RunType[];
  km: number;
  limitKm: number;
  percent: number;
  warn: boolean;
  leftKm: number;
  runs: number;
  since: string;
  isDefault: boolean;
};

const KM = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

/** An active shoe in Equipo: km against its limit, the 90 % warning and its actions (canvas: C2-Equipo). */
export function ShoeCard({ shoe }: { shoe: CardShoe }) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ message?: string }>) =>
    startTransition(async () => {
      const result = await action();
      setMessage(result.message ?? null);
      if (!result.message) setConfirming(false);
    });

  const button = "h-11 flex-1 rounded-[14px] border border-line text-sm font-bold disabled:opacity-60";

  return (
    <article className="flex flex-col gap-3 rounded-[20px] bg-card px-4 pt-3.5 pb-4">
      <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3.5">
        <ShoeImage src={shoe.image} className="h-[66px] w-[92px] rounded-[14px]" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-base leading-tight font-extrabold">{shoe.name}</h2>
            {shoe.isDefault && <span className="rounded-[10px] bg-nav-on px-2 py-0.5 text-[11px] font-extrabold text-on-nav-on">Predeterminada</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {shoe.runTypes.map((t) => (
              <span key={t} className="rounded-[10px] bg-sunk px-2.5 py-0.5 text-xs font-bold">
                {RUN_TYPE_LABELS[t]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-extrabold tabular-nums">
            {KM.format(shoe.km)} <span className="text-sm font-semibold text-muted">/ {KM.format(shoe.limitKm)} km</span>
          </span>
          <span className={`text-[13px] font-bold ${shoe.warn ? "text-warn-text" : "text-muted"}`}>{shoe.percent} %</span>
        </div>
        <div role="progressbar" aria-label="Km usados del límite" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, shoe.percent)} className="h-2.5 overflow-hidden rounded-[5px] bg-sunk">
          <div className={`h-full rounded-[5px] ${shoe.warn ? "bg-warn-btn" : "bg-primary"}`} style={{ width: `${Math.min(100, shoe.percent)}%` }} />
        </div>
        <span className="text-[13px] text-muted">
          {shoe.runs} {shoe.runs === 1 ? "carrera" : "carreras"} · en uso desde el {shoe.since}
        </span>
      </div>

      {shoe.warn && (
        <div role="status" className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 rounded-[14px] bg-warn-bg px-3 py-2.5 text-sm leading-snug font-semibold text-warn-text">
          <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l10 18H2zM12 10v5M12 18h.01" />
          </svg>
          <span>
            {shoe.leftKm > 0 ? `Pasó el 90 % del límite: ${shoe.leftKm < 1.05 ? "queda" : "quedan"} ${KM.format(shoe.leftKm)} km.` : "Llegó al límite de km."} Buen momento para buscar reemplazo.
          </span>
        </div>
      )}

      {confirming ? (
        <div className="flex flex-col gap-2.5 rounded-[14px] bg-sunk p-3">
          <span className="text-sm leading-snug">
            ¿Retirar {shoe.name}? Se guarda en el historial con {KM.format(shoe.km)} km y no recibe carreras nuevas.
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className={button}>
              Cancelar
            </button>
            <button type="button" onClick={() => run(() => retireShoe(shoe.id))} disabled={pending} className="h-11 flex-1 rounded-[14px] bg-warn-btn text-sm font-extrabold text-on-warn-btn disabled:opacity-60">
              {pending ? "Retirando…" : "Retirar"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {!shoe.isDefault && (
            <button type="button" onClick={() => run(() => makeDefaultShoe(shoe.id))} disabled={pending} className={button}>
              Hacer predeterminada
            </button>
          )}
          <button type="button" onClick={() => setConfirming(true)} disabled={pending} className={button}>
            Retirar
          </button>
        </div>
      )}

      {message && (
        <p role="alert" className="text-[13px] font-semibold text-warn-text">
          {message}
        </p>
      )}
    </article>
  );
}
