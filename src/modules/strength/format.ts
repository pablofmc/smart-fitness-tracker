import type { GroupName } from "./sets";

/** One color per muscle group; "sin clasificar" stays grey so it never reads as a trained group. */
export const GROUP_COLORS: Record<GroupName, string> = {
  Piernas: "bg-primary",
  Empuje: "bg-amber-btn",
  Tirón: "bg-accent",
  Core: "bg-nav-on",
  "Cuerpo completo": "bg-warn-btn",
  "Sin clasificar": "bg-line",
};

/** "6:10" under an hour, "1 h 02" above. */
export function setTime(seconds: number) {
  const s = Math.round(seconds);
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "Piernas y core", "Piernas, empuje y core": the groups with the most sets, at most three. */
export function groupsLine(groupSets: Partial<Record<GroupName, number>>) {
  const top = Object.entries(groupSets)
    .filter(([group]) => group !== "Sin clasificar")
    .sort((a, b) => b[1]! - a[1]!)
    .slice(0, 3)
    .map(([group], i) => (i === 0 ? group : group.toLowerCase()));
  if (top.length < 2) return top[0] ?? null;
  return `${top.slice(0, -1).join(", ")} y ${top[top.length - 1]}`;
}
