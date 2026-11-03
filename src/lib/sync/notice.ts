import type { KeyStatus } from "@/lib/garmin/key-status";

export type NoticeInput = {
  key: KeyStatus;
  lastFailed: boolean;
  stopped: boolean;
  history: { complete: boolean; percent: number; reachedDay: string | null };
};

export type NoticeKind = "blocked" | "missing" | "stopped" | "failed" | "expiring" | "importing" | null;

/** Hoy shows one notice at a time, the most serious first (design canvas, C2-Sincronizacion). */
export function pickNotice({ key, lastFailed, stopped, history }: NoticeInput): NoticeKind {
  if (key.kind === "blocked") return "blocked";
  if (key.kind === "missing") return "missing";
  if (stopped) return "stopped";
  if (lastFailed) return "failed";
  if (key.kind === "expiring") return "expiring";
  if (!history.complete) return "importing";
  return null;
}
