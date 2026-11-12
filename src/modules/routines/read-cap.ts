/** AI reads of routines each person gets per calendar month (R-USR-04, ADR-0006). */
export const AI_READS_PER_MONTH = 30;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** How many of these read times fall in the month of `today`, counted in the person's time zone. */
export function readsThisMonth(createdAt: string[], today: string, timeZone: string) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const month = today.slice(0, 7);
  return createdAt.filter((at) => day.format(new Date(at)).slice(0, 7) === month).length;
}

/** Where to look for this month's reads: a day before the month starts covers any time zone. */
export const readsSince = (today: string) => {
  const start = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 1);
  return start.toISOString();
};

/** "el 1 de diciembre": when the reads come back. */
export function nextMonthStart(today: string) {
  const month = Number(today.slice(5, 7));
  return `el 1 de ${MONTHS[month % 12]}`;
}

export const capMessage = (today: string) =>
  `Ya usaste las ${AI_READS_PER_MONTH} lecturas con IA de este mes. Escribe los ejercicios a mano; ${nextMonthStart(today)} vuelves a tener ${AI_READS_PER_MONTH}.`;
