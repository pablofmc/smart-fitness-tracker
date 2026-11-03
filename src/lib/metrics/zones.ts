import { intervals, type HrSample, type HrSettings, type Unavailable } from "./hr";

/** Upper bounds of Z1–Z4 as a share of LTHR (Friel); Z5 is everything at or above LTHR (R-RUN-05). */
const BOUNDS = [0.85, 0.9, 0.95, 1];

export function zoneOf(hr: number, lthr: number) {
  const index = BOUNDS.findIndex((bound) => hr < bound * lthr);
  return index === -1 ? 4 : index;
}

/** Whole-bpm edges for display: Z2 starts at the first of these, Z5 at the last. */
export function zoneEdges(lthr: number) {
  return BOUNDS.map((bound) => Math.ceil(bound * lthr));
}

export type ZoneTimes = { available: true; seconds: [number, number, number, number, number]; inputs: { lthr: number; settingsFrom: string } } | Unavailable;

export function timeInZones(samples: HrSample[], settings: HrSettings | null): ZoneTimes {
  if (!settings) return { available: false, reason: "Sin umbrales de FC para esa fecha" };
  const parts = intervals(samples);
  if (parts.length === 0) return { available: false, reason: "Sin datos de FC" };
  const seconds: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const { hr, seconds: dt } of parts) seconds[zoneOf(hr, settings.lthr)] += dt;
  return { available: true, seconds, inputs: { lthr: settings.lthr, settingsFrom: settings.effectiveFrom } };
}
