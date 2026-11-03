import { describe, expect, it } from "vitest";
import { bestEffort, cardiacDrift, countsForRecords, defaultTargetHr, median, paceAtHr, type RunSample } from "./running";

/** One sample per second at a constant speed. */
const constant = (seconds: number, speed: number, hr = 150, from = { t: 0, distance: 0 }): RunSample[] =>
  Array.from({ length: seconds + 1 }, (_, i) => ({ t: from.t + i, distance: from.distance + i * speed, speed, hr, gps: true }));

describe("bestEffort (golden)", () => {
  it("finds a fast 5k inside a 12k run (R-RUN-04)", () => {
    // 3 km at 5:00/km, 5 km at 4:00/km, 4 km at 5:00/km.
    const slow = 1000 / 300;
    const fast = 1000 / 240;
    const a = constant(900, slow);
    const b = constant(1200, fast, 160, { t: 900, distance: 3000 }).slice(1);
    const c = constant(1200, slow, 150, { t: 2100, distance: 8000 }).slice(1);
    const run = [...a, ...b, ...c];
    expect(bestEffort(run, 5000)).toBeCloseTo(1200, 6);
    expect(bestEffort(run, 1000)).toBeCloseTo(240, 6);
    expect(bestEffort(run, 21097.5)).toBeNull();
  });

  it("interpolates the end point and counts pauses as time", () => {
    const run: RunSample[] = [
      { t: 0, distance: 0 },
      { t: 100, distance: 400 },
      { t: 400, distance: 400 }, // standing for 5 min
      { t: 500, distance: 1200 },
    ];
    // 1000 m ends 600 m into the last 800 m segment: 400 + 0.75 × 100 = 475 s.
    expect(bestEffort(run, 1000)).toBeCloseTo(475, 6);
  });
});

describe("countsForRecords", () => {
  it("excludes treadmill runs and runs without GPS", () => {
    expect(countsForRecords("treadmill_running", constant(10, 3))).toBe(false);
    expect(countsForRecords("running", constant(10, 3).map(({ gps, ...s }) => (void gps, s)))).toBe(false);
    expect(countsForRecords("running", constant(10, 3))).toBe(true);
  });
});

describe("cardiacDrift (golden)", () => {
  it("is (EF1 − EF2) / EF1: same speed, HR 150 then 156 gives 3.846 %", () => {
    const run = [...constant(1800, 3, 150), ...constant(1800, 3, 156, { t: 1801, distance: 5403 })];
    const drift = cardiacDrift(run, []);
    if (!drift.available) throw new Error(drift.reason);
    expect(drift.percent).toBeCloseTo((1 - 150 / 156) * 100, 6);
    expect(drift.percent).toBeCloseTo(3.846, 3);
    expect(drift.good).toBe(true);
  });

  it("only applies to steady runs of 60 min or more", () => {
    expect(cardiacDrift(constant(1800, 3), []).available).toBe(false);
    const laps = [
      { distance: 1000, seconds: 300 },
      { distance: 1000, seconds: 400 },
      { distance: 300, seconds: 200 },
    ];
    expect(cardiacDrift(constant(3700, 3), laps)).toEqual({ available: false, reason: "Solo en carreras de ritmo constante" });
    expect(cardiacDrift(constant(3700, 3), [{ distance: 1000, seconds: 300 }, { distance: 1000, seconds: 320 }, { distance: 300, seconds: 200 }]).available).toBe(true);
  });
});

describe("paceAtHr (golden)", () => {
  it("skips the first 10 minutes and averages samples within ±3 bpm", () => {
    const warmup = constant(600, 2.5, 120);
    const steady = constant(600, 1000 / 330, 150, { t: 600, distance: 1500 }).slice(1); // 5:30/km at the target
    const result = paceAtHr([...warmup, ...steady], 148);
    if (!result.available) throw new Error(result.reason);
    expect(result.secondsPerKm).toBeCloseTo(330, 6);
    expect(result.qualifyingMinutes).toBeCloseTo(599 / 60, 6);
  });

  it("needs 5 qualifying minutes and GPS", () => {
    expect(paceAtHr(constant(700, 3, 150), 150).available).toBe(false);
    expect(paceAtHr(constant(2000, 3, 150).map((s) => ({ ...s, gps: false })), 150)).toEqual({ available: false, reason: "Sin GPS" });
  });

  it("defaults to 87 % of LTHR", () => {
    expect(defaultTargetHr(170)).toBe(148);
  });
});

describe("median", () => {
  it("handles odd, even and empty lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});
