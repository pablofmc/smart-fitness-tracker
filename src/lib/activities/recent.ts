import { sportGroup } from "./list";
import { addDays } from "@/lib/sync/streams";

/** Sport groups by sessions in the last `weeks` weeks, most first, so a sport you take up rises on its own (R-ACT-04). */
export function recentSportOrder(activities: { day: string; sport: string }[], today: string, weeks = 4) {
  const from = addDays(today, -weeks * 7);
  const counts = new Map<string, { count: number; latest: string }>();
  for (const a of activities) {
    if (a.day < from || a.day > today) continue;
    const group = sportGroup(a.sport);
    const current = counts.get(group) ?? { count: 0, latest: a.day };
    counts.set(group, { count: current.count + 1, latest: a.day > current.latest ? a.day : current.latest });
  }
  return [...counts].sort((a, b) => b[1].count - a[1].count || b[1].latest.localeCompare(a[1].latest)).map(([group, { count }]) => ({ group, count }));
}
