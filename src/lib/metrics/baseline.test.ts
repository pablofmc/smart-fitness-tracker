import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/sync/streams";
import { baseline } from "./baseline";

const today = "2026-03-01";
/** Alternating 50 and 60 over the 60 days before today: mean 55, SD 5, range 50–60. */
const history = Array.from({ length: 60 }, (_, i) => ({ day: addDays(today, -60 + i), value: i % 2 ? 60 : 50 }));

describe("baseline (golden)", () => {
  it("compares the last 7 days' mean with mean ± 1 SD of the 60 days before today", () => {
    const series = [...history.slice(0, -6), ...[70, 70, 70, 70, 70, 70, 70].map((value, i) => ({ day: addDays(today, -6 + i), value }))];
    const result = baseline(series, today, { recent: 7 });
    if (!result.available) throw new Error("expected a baseline");
    expect(result.value).toBe(70);
    expect(result.position).toBe("above");
    expect(result.inputs.recentDays).toBe(7);
  });

  it("computes the range by hand: mean 55, SD 5", () => {
    const result = baseline([...history, { day: today, value: 52 }], today, { recent: 1 });
    if (!result.available) throw new Error("expected a baseline");
    expect(result.mean).toBe(55);
    expect(result.low).toBe(50);
    expect(result.high).toBe(60);
    expect(result.position).toBe("within");
    expect(result.inputs.rangeDays).toBe(60);
  });

  it("says 'sin línea base aún' under 14 range values or 3 recent ones", () => {
    expect(baseline(history.slice(-13), today, { recent: 1 })).toEqual({ available: false, reason: "sin línea base aún" });
    const sparse = [...history.slice(0, 40), { day: addDays(today, -1), value: 50 }, { day: today, value: 50 }];
    expect(baseline(sparse, today, { recent: 7 }).available).toBe(false);
  });
});
