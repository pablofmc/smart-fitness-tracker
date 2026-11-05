import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/sync/streams";
import { correlate, pairByDay, ranks, spearman, strengthOf } from "./correlation";

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
