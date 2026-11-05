export function clock(seconds: number) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}

export const paceLabel = (secondsPerKm: number) => `${clock(secondsPerKm)} /km`;

export const EFFORT_LABELS = [
  { key: "best_1k_s", label: "1 km" },
  { key: "best_5k_s", label: "5 km" },
  { key: "best_10k_s", label: "10 km" },
  { key: "best_21k_s", label: "21,1 km" },
] as const;
