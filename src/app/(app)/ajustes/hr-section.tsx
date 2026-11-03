"use client";

import { useActionState, useState } from "react";
import { zoneEdges } from "@/lib/metrics/zones";
import { saveHrSettings, type SaveHrState } from "./hr-actions";

type Version = { effectiveFrom: string; maxHr: number; restingHr: number; lthr: number; source: string };

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const ZONE_COLORS = ["bg-field", "bg-nav-on", "bg-primary", "bg-amber-btn", "bg-warn-btn"];

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Max, resting and threshold HR, saved as a new version from today (design canvas, C2-Ajustes). */
export function HrSection({ versions }: { versions: Version[] }) {
  const current = versions[0];
  const [values, setValues] = useState({ maxHr: current?.maxHr ?? 190, restingHr: current?.restingHr ?? 50, lthr: current?.lthr ?? 170 });
  const [state, action, pending] = useActionState<SaveHrState, FormData>(saveHrSettings, {});
  const dirty = !current || values.maxHr !== current.maxHr || values.restingHr !== current.restingHr || values.lthr !== current.lthr;
  const edges = zoneEdges(values.lthr);
  const ranges = [`< ${edges[0]}`, `${edges[0]}–${edges[1] - 1}`, `${edges[1]}–${edges[2] - 1}`, `${edges[2]}–${edges[3] - 1}`, `≥ ${edges[3]}`];

  const fields = [
    { key: "maxHr", label: "FC máxima", hint: "Tu máximo medido" },
    { key: "restingHr", label: "FC en reposo", hint: "La base del TRIMP" },
    { key: "lthr", label: "FC umbral", hint: "Base de tus zonas" },
  ] as const;

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-[18px]">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[17px] font-extrabold">Frecuencia cardíaca</h2>
        <span className="text-[13px] text-muted">Calcula tus zonas y tu carga (TRIMP).</span>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="today" value={localToday()} suppressHydrationWarning />
        {fields.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-2 py-1.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold">{field.label}</span>
              <span className="text-xs text-muted">{field.hint}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Bajar ${field.label}`}
                onClick={() => setValues((v) => ({ ...v, [field.key]: v[field.key] - 1 }))}
                className="size-11 rounded-full bg-sunk text-lg font-extrabold"
              >
                −
              </button>
              <input type="hidden" name={field.key} value={values[field.key]} />
              <span className="min-w-16 text-center text-xl font-extrabold tabular-nums">{values[field.key]} lpm</span>
              <button
                type="button"
                aria-label={`Subir ${field.label}`}
                onClick={() => setValues((v) => ({ ...v, [field.key]: v[field.key] + 1 }))}
                className="size-11 rounded-full bg-sunk text-lg font-extrabold"
              >
                +
              </button>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-xs font-bold text-muted">Tus zonas</span>
          <div className="grid grid-cols-5 gap-1">
            {ranges.map((range, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className={`h-2.5 rounded ${ZONE_COLORS[i]}`} />
                <span className="text-xs font-extrabold">Z{i + 1}</span>
                <span className="text-[11px] text-muted tabular-nums">{range}</span>
              </div>
            ))}
          </div>
        </div>

        {dirty ? (
          <div className="flex flex-col gap-2 pt-1">
            <button type="submit" disabled={pending} className="h-12 rounded-full bg-primary text-[15px] font-extrabold text-on-primary disabled:opacity-60">
              {pending ? "Guardando…" : "Guardar · vigente desde hoy"}
            </button>
            <span className="text-xs leading-snug text-muted">Tus actividades anteriores conservan las zonas que tenías en su fecha.</span>
          </div>
        ) : null}
        {state.message ? (
          <p role="alert" className="text-sm font-semibold text-warn">
            {state.message}
          </p>
        ) : null}
      </form>

      {versions.length ? (
        <div className="flex flex-col pt-1">
          <span className="pb-1 text-xs font-bold text-muted">Historial</span>
          {versions.map((v, i) => (
            <div key={v.effectiveFrom} className="flex justify-between gap-3 border-t border-field py-2.5 text-[13px]">
              <span className="font-bold">
                {DATE.format(new Date(`${v.effectiveFrom}T00:00:00Z`)).replace(".", "")}
                {i === 0 ? " · vigente" : ""}
                {v.source === "garmin" ? " · de Garmin" : ""}
              </span>
              <span className="text-muted tabular-nums">
                máx {v.maxHr} · reposo {v.restingHr} · umbral {v.lthr}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-muted">Aún no hay umbrales. Se toman de Garmin en la próxima sincronización, o guárdalos aquí.</p>
      )}
    </section>
  );
}
