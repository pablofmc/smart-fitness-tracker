import type { DayValue } from "./baseline";
import { addDays } from "@/lib/sync/streams";

export const MIN_PAIRED_DAYS = 30;

/** Ranks from 1, ties sharing the mean of their positions. */
export function ranks(values: number[]) {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(values.length);
  for (let start = 0; start < order.length; ) {
    let end = start;
    while (end + 1 < order.length && order[end + 1].v === order[start].v) end++;
    const rank = (start + end) / 2 + 1;
    for (let k = start; k <= end; k++) out[order[k].i] = rank;
    start = end + 1;
  }
  return out;
}

function pearson(x: number[], y: number[]) {
  const mx = x.reduce((s, v) => s + v, 0) / x.length;
  const my = y.reduce((s, v) => s + v, 0) / y.length;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < x.length; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy);
}

/** Spearman ρ: Pearson on the ranks, which handles ties. Null when either side never varies. */
export function spearman(x: number[], y: number[]) {
  return x.length < 2 ? null : pearson(ranks(x), ranks(y));
}

/** X on day d paired with Y on day d + lag. */
export function pairByDay(x: DayValue[], y: DayValue[], lag: number) {
  const ys = new Map(y.map((d) => [d.day, d.value]));
  const pairs: { x: number; y: number }[] = [];
  for (const d of x) {
    const other = ys.get(addDays(d.day, lag));
    if (other !== undefined) pairs.push({ x: d.value, y: other });
  }
  return pairs;
}

export type Strength = "muy débil" | "débil" | "moderada" | "fuerte";

export function strengthOf(rho: number): Strength {
  const r = Math.abs(rho);
  return r < 0.2 ? "muy débil" : r < 0.4 ? "débil" : r < 0.6 ? "moderada" : "fuerte";
}

export type Correlation =
  | { enough: true; rho: number; n: number; strength: Strength }
  | { enough: false; n: number; reason: "datos insuficientes" };

/** Below 30 paired days the answer is "datos insuficientes", whatever ρ is (R-COR-02). */
export function correlate(x: DayValue[], y: DayValue[], lag: number): Correlation {
  const pairs = pairByDay(x, y, lag);
  const rho = pairs.length >= MIN_PAIRED_DAYS ? spearman(pairs.map((p) => p.x), pairs.map((p) => p.y)) : null;
  if (rho === null) return { enough: false, n: pairs.length, reason: "datos insuficientes" };
  return { enough: true, rho, n: pairs.length, strength: strengthOf(rho) };
}
