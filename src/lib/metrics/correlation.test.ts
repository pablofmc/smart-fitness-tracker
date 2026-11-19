import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/sync/streams";
import { cohensD, compareTag, correlate, effectOf, pairByDay, ranks, spearman, strengthOf } from "./correlation";

const days = (values: number[], from = "2026-01-01") => values.map((value, i) => ({ day: addDays(from, i), value }));

describe("ranks", () => {
  it("gives ties the mean of their positions", () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
  });
});

describe("spearman (golden)", () => {
  it("is 1 for any increasing relation and −1 for a decreasing one", () => {
    expect(spearman([1, 2, 3, 4, 5], [1, 4, 9, 16, 25])).toBeCloseTo(1, 12);
    expect(spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 12);
  });

  it("matches hand computations of 1 − 6·Σd² / (n(n² − 1)) with n = 5", () => {
    expect(spearman([1, 2, 3, 4, 5], [1, 3, 2, 4, 5])).toBeCloseTo(0.9, 12);
    expect(spearman([1, 2, 3, 4, 5], [2, 1, 4, 3, 5])).toBeCloseTo(0.8, 12);
    expect(spearman([1, 2, 3, 4, 5], [1, 3, 2, 5, 4])).toBeCloseTo(0.8, 12);
    expect(spearman([1, 2, 3, 4, 5], [3, 1, 2, 4, 5])).toBeCloseTo(0.7, 12);
  });

  it("is undefined when one side never varies", () => {
    expect(spearman([1, 2, 3], [4, 4, 4])).toBeNull();
  });
});

describe("pairByDay", () => {
  it("pairs X on day d with Y on day d + lag", () => {
    expect(pairByDay(days([1, 2, 3]), days([10, 20, 30]), 1)).toEqual([
      { x: 1, y: 20 },
      { x: 2, y: 30 },
    ]);
  });
});

describe("correlate", () => {
  it("says 'datos insuficientes' under 30 paired days, whatever ρ is", () => {
    const x = days(Array.from({ length: 29 }, (_, i) => i));
    expect(correlate(x, x, 0)).toEqual({ enough: false, n: 29, reason: "datos insuficientes" });
    const y = days(Array.from({ length: 30 }, (_, i) => i));
    expect(correlate(y, y, 0)).toEqual({ enough: true, rho: 1, n: 30, strength: "fuerte" });
  });

  it("labels strength by |ρ|", () => {
    expect([0.1, -0.25, 0.45, -0.7].map(strengthOf)).toEqual(["muy débil", "débil", "moderada", "fuerte"]);
  });
});

describe("cohensD (golden)", () => {
  it("divides the difference of means by the pooled SD", () => {
    // a: mean 3, Σ(x−m)² = 10; b: mean 5, Σ = 10; pooled SD = √(20 / 8) = 1.5811
    expect(cohensD([1, 2, 3, 4, 5], [3, 4, 5, 6, 7])).toBeCloseTo(-2 / Math.sqrt(2.5), 12);
  });

  it("is undefined when neither group varies or a group has one value", () => {
    expect(cohensD([2, 2], [2, 2])).toBeNull();
    expect(cohensD([1], [1, 2, 3])).toBeNull();
  });
});

describe("effectOf", () => {
  it("uses the |d| bands of the skill", () => {
    expect([0.19, -0.2, 0.49, 0.5, -0.79, 0.8].map(effectOf)).toEqual(["muy débil", "débil", "débil", "moderada", "moderada", "fuerte"]);
  });
});

describe("compareTag", () => {
  const checkins = (tagged: boolean[], from = "2026-01-01") => tagged.map((t, i) => ({ day: addDays(from, i), tags: t ? ["Alcohol"] : [] }));

  it("pairs a check-in on day d with Y on day d + lag and splits by the tag", () => {
    const c = compareTag(checkins([true, false, true]), "Alcohol", days([0, 50, 40, 52]), 1);
    expect(c.withTag).toEqual([50, 52]);
    expect(c.withoutTag).toEqual([40]);
  });

  it("skips days without a check-in, so they never count as days without the tag", () => {
    const c = compareTag([{ day: "2026-01-02", tags: [] }], "Alcohol", days([10, 20, 30]), 0);
    expect(c.withoutTag).toEqual([20]);
  });

  it("needs 30 paired days and 10 in each group", () => {
    const y = days(Array.from({ length: 41 }, (_, i) => 40 + (i % 7)));
    expect(compareTag(checkins(Array.from({ length: 40 }, (_, i) => i < 9)), "Alcohol", y, 1)).toMatchObject({ enough: false, n: 40 });
    expect(compareTag(checkins(Array.from({ length: 29 }, (_, i) => i < 15)), "Alcohol", y, 1)).toMatchObject({ enough: false, n: 29 });
  });

  it("gives the difference of means and its strength when there is enough data", () => {
    // 10 tagged days followed by Y = 40 or 42, 20 untagged followed by 50 or 52: diff −10, pooled SD ≈ 1.02.
    const tagged = Array.from({ length: 30 }, (_, i) => i < 10);
    const y = days([0, ...Array.from({ length: 30 }, (_, i) => (i < 10 ? 40 : 50) + (i % 2) * 2)]);
    const c = compareTag(checkins(tagged), "Alcohol", y, 1);
    expect(c).toMatchObject({ enough: true, n: 30, meanWith: 41, meanWithout: 51, diff: -10, strength: "fuerte" });
  });
});
