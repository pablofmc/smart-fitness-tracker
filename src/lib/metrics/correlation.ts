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

/** Minimum days in each group, with and without the tag (R-COR-04, fitness-metrics skill). */
export const MIN_TAG_GROUP_DAYS = 10;

export function effectOf(d: number): Strength {
  const a = Math.abs(d);
  return a < 0.2 ? "muy débil" : a < 0.5 ? "débil" : a < 0.8 ? "moderada" : "fuerte";
}

const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const sumSq = (v: number[], m: number) => v.reduce((s, x) => s + (x - m) ** 2, 0);

/** Cohen's d with the pooled standard deviation. Null when neither group varies. */
export function cohensD(a: number[], b: number[]) {
  if (a.length < 2 || b.length < 2) return null;
  const ma = mean(a);
  const mb = mean(b);
  const pooled = Math.sqrt((sumSq(a, ma) + sumSq(b, mb)) / (a.length + b.length - 2));
  return pooled === 0 ? null : (ma - mb) / pooled;
}

export type TagComparison = {
  /** Y on days after a check-in with the tag, and after one without it. */
  withTag: number[];
  withoutTag: number[];
} & (
  | { enough: true; n: number; meanWith: number; meanWithout: number; diff: number; d: number; strength: Strength }
  | { enough: false; n: number; reason: "datos insuficientes" }
);

/**
 * A tag against a numeric metric (R-COR-04): Y on day d + lag, split by whether day d's check-in had the
 * tag. Only days with a check-in count, since a day without one says nothing about the tag. Below 30
 * paired days, or 10 in either group, the answer is "datos insuficientes".
 */
export function compareTag(checkins: { day: string; tags: string[] }[], tag: string, y: DayValue[], lag: number): TagComparison {
  const ys = new Map(y.map((d) => [d.day, d.value]));
  const withTag: number[] = [];
  const withoutTag: number[] = [];
  for (const c of checkins) {
    const value = ys.get(addDays(c.day, lag));
    if (value === undefined) continue;
    (c.tags.includes(tag) ? withTag : withoutTag).push(value);
  }
  const n = withTag.length + withoutTag.length;
  const d = n >= MIN_PAIRED_DAYS && withTag.length >= MIN_TAG_GROUP_DAYS && withoutTag.length >= MIN_TAG_GROUP_DAYS ? cohensD(withTag, withoutTag) : null;
  if (d === null) return { withTag, withoutTag, enough: false, n, reason: "datos insuficientes" };
  const meanWith = mean(withTag);
  const meanWithout = mean(withoutTag);
  return { withTag, withoutTag, enough: true, n, meanWith, meanWithout, diff: meanWith - meanWithout, d, strength: effectOf(d) };
}
