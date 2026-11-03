/** HR settings in effect on a day (R-LOAD-05). */
export type HrSettings = { id: number; effectiveFrom: string; maxHr: number; restingHr: number; lthr: number };

/** One HR sample: seconds since the activity started, and beats per minute. */
export type HrSample = { t: number; hr: number };

export type Unavailable = { available: false; reason: string };

/** A gap longer than this between samples is a pause and counts for nothing (fitness-metrics skill). */
export const MAX_SAMPLE_GAP_S = 30;

/** The latest settings effective on or before the day, or none. Days are "YYYY-MM-DD", so they sort as text. */
export function settingsFor(day: string, versions: HrSettings[]) {
  return versions.filter((v) => v.effectiveFrom <= day).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null;
}

/** Each sample with the time until the next one, pauses dropped. */
export function intervals(samples: HrSample[]) {
  const sorted = [...samples].sort((a, b) => a.t - b.t);
  const out: { hr: number; seconds: number }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const seconds = sorted[i + 1].t - sorted[i].t;
    if (seconds > 0 && seconds <= MAX_SAMPLE_GAP_S && sorted[i].hr > 0) out.push({ hr: sorted[i].hr, seconds });
  }
  return out;
}
