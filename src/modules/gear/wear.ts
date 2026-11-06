/** Share of the km limit from which a shoe shows its warning, in Equipo and in Hoy (R-GEAR-04). */
export const WARN_AT = 0.9;

/** How worn a shoe is: km against its limit. */
export function shoeWear(km: number, limitKm: number) {
  const share = limitKm > 0 ? km / limitKm : 0;
  return {
    percent: Math.round(share * 100),
    warn: share >= WARN_AT,
    leftKm: Math.max(0, limitKm - km),
  };
}

/** Hoy shows the warning unless it was hidden until today or later. Days are "YYYY-MM-DD". */
export const warningVisibleInToday = (warn: boolean, hiddenUntil: string | null, today: string) => warn && (hiddenUntil === null || hiddenUntil < today);
