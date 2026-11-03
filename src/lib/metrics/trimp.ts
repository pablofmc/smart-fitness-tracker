import { intervals, type HrSample, type HrSettings, type Unavailable } from "./hr";

export const TRIMP_FORMULA_VERSION = 1;

export type Trimp = { available: true; value: number; minutes: number; inputs: { maxHr: number; restingHr: number; settingsFrom: string } } | Unavailable;

/** Banister TRIMP, integrated over the samples, with the male coefficient 1.92 (R-LOAD-01). */
export function trimp(samples: HrSample[], settings: HrSettings | null): Trimp {
  if (!settings) return { available: false, reason: "Sin umbrales de FC para esa fecha" };
  if (settings.maxHr <= settings.restingHr) return { available: false, reason: "La FC máxima debe ser mayor que la de reposo" };
  const parts = intervals(samples);
  if (parts.length === 0) return { available: false, reason: "Sin datos de FC" };

  let value = 0;
  let seconds = 0;
  for (const { hr, seconds: dt } of parts) {
    const reserve = Math.min(1, Math.max(0, (hr - settings.restingHr) / (settings.maxHr - settings.restingHr)));
    value += (dt / 60) * reserve * 0.64 * Math.exp(1.92 * reserve);
    seconds += dt;
  }
  return {
    available: true,
    value,
    minutes: seconds / 60,
    inputs: { maxHr: settings.maxHr, restingHr: settings.restingHr, settingsFrom: settings.effectiveFrom },
  };
}
