/** How many days ahead the app warns that the key expires (R-SYN-05). */
export const EXPIRY_WARNING_DAYS = 14;

export type KeyRecord = { expiresOn: string; blockedAt: string | null };

export type KeyStatus =
  | { kind: "missing" }
  | { kind: "blocked"; expiresOn: string }
  | { kind: "expiring"; expiresOn: string; days: number }
  | { kind: "ok"; expiresOn: string };

const DAY_MS = 86_400_000;

/** Both arguments are calendar days (YYYY-MM-DD), so the result is a whole number of days. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

export function keyStatus(key: KeyRecord | null, today: string): KeyStatus {
  if (!key) return { kind: "missing" };
  const days = daysBetween(today, key.expiresOn);
  if (key.blockedAt || days < 0) return { kind: "blocked", expiresOn: key.expiresOn };
  if (days <= EXPIRY_WARNING_DAYS) return { kind: "expiring", expiresOn: key.expiresOn, days };
  return { kind: "ok", expiresOn: key.expiresOn };
}
