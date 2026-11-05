export type DayLoad = { day: string; load: number };
export type FormDay = { day: string; load: number; ctl: number; atl: number; tsb: number };

const DAY_MS = 86_400_000;
const next = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

/** Daily load: TRIMP summed over all activities of a day, all sports together (R-LOAD-02). */
export function dailyLoads(activities: { day: string; trimp: number }[]) {
  const byDay = new Map<string, number>();
  for (const { day, trimp } of activities) byDay.set(day, (byDay.get(day) ?? 0) + trimp);
  return [...byDay].map(([day, load]) => ({ day, load })).sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Fitness (CTL, 42 days), fatigue (ATL, 7 days) and form (TSB) from the first day of data to `until`,
 * with rest days at load 0. TSB is yesterday's CTL minus yesterday's ATL (R-LOAD-03).
 */
export function formCurve(loads: DayLoad[], until: string): FormDay[] {
  if (loads.length === 0) return [];
  const byDay = new Map(loads.map((l) => [l.day, l.load]));
  const out: FormDay[] = [];
  let ctl = 0;
  let atl = 0;
  for (let day = loads[0].day; day <= until; day = next(day)) {
    const load = byDay.get(day) ?? 0;
    const tsb = ctl - atl;
    ctl += (load - ctl) / 42;
    atl += (load - atl) / 7;
    out.push({ day, load, ctl, atl, tsb });
  }
  return out;
}
