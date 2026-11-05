import { addDays } from "@/lib/sync/streams";

export type ListedActivity = {
  id: number;
  name: string | null;
  sport: string;
  local_day: string;
  duration_s: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  exercise_count: number | null;
  trimp?: number | null;
};

const GROUPS: Record<string, string> = {
  running: "Correr",
  treadmill_running: "Correr",
  trail_running: "Correr",
  track_running: "Correr",
  strength_training: "Fuerza",
  hiit: "HIIT",
  walking: "Caminata",
  hiking: "Caminata",
  cycling: "Ciclismo",
  indoor_cycling: "Ciclismo",
  road_biking: "Ciclismo",
  mountain_biking: "Ciclismo",
  lap_swimming: "Natación",
  open_water_swimming: "Natación",
};

/** A sport with no group still shows up, under "Otros", with no code change (R-ACT-01). */
export function sportGroup(sport: string) {
  return GROUPS[sport] ?? "Otros";
}

/** Every sport key sharing a group, for "compared with your other …". Otros only matches the sport itself. */
export function sportsInGroup(sport: string) {
  const group = GROUPS[sport];
  return group ? Object.keys(GROUPS).filter((key) => GROUPS[key] === group) : [sport];
}

export const PERIODS = [
  { key: "4s", label: "4 sem", days: 28 },
  { key: "3m", label: "3 meses", days: 91 },
  { key: "1a", label: "1 año", days: 365 },
  { key: "todo", label: "Todo", days: null },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];

export function pickPeriod(value: unknown) {
  return PERIODS.find((period) => period.key === value) ?? PERIODS[0];
}

export function periodStart(period: (typeof PERIODS)[number], today: string) {
  return period.days === null ? null : addDays(today, -period.days);
}

/** Groups with activities in the period, most frequent first. */
export function sportChips(activities: ListedActivity[]) {
  const counts = new Map<string, number>();
  for (const { sport } of activities) counts.set(sportGroup(sport), (counts.get(sportGroup(sport)) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([group]) => group);
}

function mondayOf(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

const WEEK_DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" });
const WEEK_DATE_YEAR = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const ROW_DATE = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const clean = (date: string) => date.replaceAll(".", "").replace(",", "");

export function weekLabel(monday: string, today: string) {
  if (monday === mondayOf(today)) return "Esta semana";
  const format = monday.slice(0, 4) === today.slice(0, 4) ? WEEK_DATE : WEEK_DATE_YEAR;
  return `Semana del ${clean(format.format(new Date(`${monday}T00:00:00Z`)))}`;
}

/** "2026-10-26" → "26 oct 2026". */
export function formatShortDay(day: string) {
  return clean(WEEK_DATE_YEAR.format(new Date(`${day}T00:00:00Z`)));
}

/** "2026-10-26" → "Lun 26 oct". */
export function formatRowDate(day: string) {
  const date = clean(ROW_DATE.format(new Date(`${day}T00:00:00Z`)));
  return date.charAt(0).toUpperCase() + date.slice(1);
}

/** 6720 → "1 h 52 min", 2880 → "48 min". */
export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

const KM = new Intl.NumberFormat("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const METERS = new Intl.NumberFormat("es", { maximumFractionDigits: 0, useGrouping: "always" });

export function formatKm(meters: number) {
  return `${KM.format(meters / 1000)} km`;
}

/** The headline for a row: pool sessions in metres, other distances in km, gym sessions by exercises (R-DAT-05). */
export function headline({ sport, distance_m, exercise_count }: ListedActivity) {
  if (distance_m && distance_m > 0) return sportGroup(sport) === "Natación" ? `${METERS.format(distance_m)} m` : formatKm(distance_m);
  if (exercise_count) return `${exercise_count} ${exercise_count === 1 ? "ejercicio" : "ejercicios"}`;
  return null;
}

export function weekTotal(items: ListedActivity[]) {
  const meters = items.reduce((sum, item) => sum + (item.distance_m ?? 0), 0);
  const seconds = items.reduce((sum, item) => sum + (item.duration_s ?? 0), 0);
  const load = items.reduce((sum, item) => sum + (item.trimp ?? 0), 0);
  return [meters > 0 ? formatKm(meters) : null, formatDuration(seconds), load > 0 ? `${Math.round(load)} TRIMP` : null].filter(Boolean).join(" · ");
}

/** Activities must come newest first; weeks start on Monday and keep that order. */
export function groupByWeek(activities: ListedActivity[], today: string) {
  const weeks = new Map<string, ListedActivity[]>();
  for (const activity of activities) {
    const monday = mondayOf(activity.local_day);
    weeks.set(monday, [...(weeks.get(monday) ?? []), activity]);
  }
  return [...weeks].map(([monday, items]) => ({ monday, label: weekLabel(monday, today), total: weekTotal(items), items }));
}
