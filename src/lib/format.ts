const SHORT_DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "2026-11-09" → "9 nov 2026". The input is a calendar day, so it's formatted in UTC to keep that day. */
export function formatShortDate(day: string) {
  return SHORT_DATE.format(new Date(`${day}T00:00:00Z`)).replace(".", "");
}

export function formatRelativeTime(iso: string, now: Date) {
  const minutes = Math.round((now.getTime() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "Actualizado ahora";
  if (minutes < 60) return `Actualizado hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Actualizado hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `Actualizado hace ${days} ${days === 1 ? "día" : "días"}`;
}

const MONTH_YEAR = new Intl.DateTimeFormat("es", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2023-03-14" → "marzo de 2023". */
export function formatMonthYear(day: string) {
  return MONTH_YEAR.format(new Date(`${day}T00:00:00Z`));
}
