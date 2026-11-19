const SHORT = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" });
/** "2026-11-12" → "12 nov". */
export const shortDay = (day: string) => SHORT.format(new Date(`${day}T00:00:00Z`)).replaceAll(".", "");
