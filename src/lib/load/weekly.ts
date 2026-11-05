import { sportGroup } from "@/lib/activities/list";
import { addDays } from "@/lib/sync/streams";

export type LoadedActivity = { day: string; sport: string; trimp: number | null; zoneSeconds: number[] | null };

export function mondayOf(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

export type Week = { monday: string; zones: number[]; bySport: Record<string, number> };

/** Time in zones and TRIMP by sport group, per Monday-start week, from `from` to `today` (R-RUN-05, R-LOAD-02). */
export function weeklyLoad(activities: LoadedActivity[], from: string, today: string): Week[] {
  const weeks = new Map<string, Week>();
  for (let monday = mondayOf(from); monday <= today; monday = addDays(monday, 7)) {
    weeks.set(monday, { monday, zones: [0, 0, 0, 0, 0], bySport: {} });
  }
  for (const activity of activities) {
    const week = weeks.get(mondayOf(activity.day));
    if (!week) continue;
    activity.zoneSeconds?.forEach((seconds, i) => (week.zones[i] += seconds));
    if (activity.trimp !== null) {
      const group = sportGroup(activity.sport);
      week.bySport[group] = (week.bySport[group] ?? 0) + activity.trimp;
    }
  }
  return [...weeks.values()];
}
