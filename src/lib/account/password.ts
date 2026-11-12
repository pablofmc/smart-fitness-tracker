/** A password chosen in the app: long enough to stand on its own, since nobody else can reset it (R-USR-03). */
export const MIN_PASSWORD_LENGTH = 10;

/** The flag the account script sets in `app_metadata`, which the person can't edit (ADR-0007). */
export const TEMP_PASSWORD_FLAG = "temp_password";

export function hasTemporaryPassword(claims: { app_metadata?: Record<string, unknown> } | null | undefined) {
  return claims?.app_metadata?.[TEMP_PASSWORD_FLAG] === true;
}

/** Why a new password can't be saved yet, or null when it can. */
export function newPasswordProblem(current: string, next: string, repeat: string): string | null {
  if (!current) return "Escribe tu contraseña actual.";
  if (next.length < MIN_PASSWORD_LENGTH) return `La nueva contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (next !== repeat) return "Las dos contraseñas nuevas no coinciden.";
  if (next === current) return "La nueva contraseña debe ser distinta de la actual.";
  return null;
}
