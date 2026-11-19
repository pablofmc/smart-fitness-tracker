import { describe, expect, it } from "vitest";
import type { Baseline } from "./baseline";
import { addDays } from "@/lib/sync/streams";
import { bandOf, baselinePart, formPart, readiness, readinessOn } from "./readiness";

const b = (value: number, mean: number, sd: number): Extract<Baseline, { available: true }> => ({
  available: true,
  value,
  mean,
  low: mean - sd,
  high: mean + sd,
  position: value < mean - sd ? "below" : value > mean + sd ? "above" : "within",
  inputs: { rangeDays: 60, recentDays: 7, window: "" },
});
const none: Baseline = { available: false, reason: "sin línea base aún" };

describe("baselinePart (golden)", () => {
  it("gives 50 at the mean, 75 at +1 SD, 25 at −1 SD", () => {
    expect(baselinePart(b(53, 53, 7)).score).toBe(50);
    expect(baselinePart(b(60, 53, 7)).score).toBe(75);
    expect(baselinePart(b(46, 53, 7)).score).toBe(25);
  });

  it("clamps to 0–100 and treats a zero SD as z = 0", () => {
    expect(baselinePart(b(80, 53, 7)).score).toBe(100);
    expect(baselinePart(b(30, 53, 7)).score).toBe(0);
    expect(baselinePart(b(7, 7, 0))).toEqual({ score: 50, z: 0 });
  });
});

describe("formPart (golden)", () => {
  it("is 70 + 2 × TSB, clamped", () => {
    expect([0, 15, -10, -8, -35, 30, -50].map((t) => formPart(t).score)).toEqual([70, 100, 50, 54, 0, 100, 0]);
  });
});

describe("readiness (golden)", () => {
  it("weighs HRV 40 %, sleep 35 % and form 25 %", () => {
    // HRV z = 4/7 → 64.29 → 64; sleep 7.5 h vs 7 ± 0.5 → 75; TSB −8 → 54.
    // 0.4·64 + 0.35·75 + 0.25·54 = 25.6 + 26.25 + 13.5 = 65.35 → 65.
    const r = readiness({ hrv: b(57, 53, 7), sleep: b(7.5, 7, 0.5), tsb: -8, sleptLastNight: true });
    expect(r).toMatchObject({ available: true, score: 65, band: "buena", hrv: { score: 64 }, sleep: { score: 75 }, form: { score: 54, tsb: -8 } });
  });

  it("gives no score when an input is missing, naming the first one", () => {
    expect(readiness({ hrv: none, sleep: b(7, 7, 1), tsb: 0, sleptLastNight: true })).toEqual({ available: false, reason: "sin línea base de HRV" });
    expect(readiness({ hrv: b(50, 50, 5), sleep: none, tsb: 0, sleptLastNight: false })).toEqual({ available: false, reason: "sin sueño de anoche" });
    expect(readiness({ hrv: b(50, 50, 5), sleep: none, tsb: 0, sleptLastNight: true })).toEqual({ available: false, reason: "sin línea base de sueño" });
    expect(readiness({ hrv: b(50, 50, 5), sleep: b(7, 7, 1), tsb: null, sleptLastNight: true })).toEqual({ available: false, reason: "sin carga calculada" });
  });
});

describe("bandOf", () => {
  it("uses the skill's bands", () => {
    expect([39, 40, 59, 60, 79, 80].map(bandOf)).toEqual(["baja", "media", "media", "buena", "buena", "muy buena"]);
  });
});

describe("readinessOn", () => {
  const day = "2026-03-01";
  // HRV: 60 days of history plus the last week. Sleep: 60 nights alternating 6.5 and 7.5 h (mean 7, SD 0.5), then 7 h.
  const hrv = [...Array.from({ length: 60 }, (_, i) => ({ day: addDays(day, -60 + i), value: i % 2 ? 56 : 50 })), ...Array.from({ length: 7 }, (_, i) => ({ day: addDays(day, -6 + i), value: 56 }))];
  const sleep = Array.from({ length: 61 }, (_, i) => ({ day: addDays(day, -60 + i), value: i === 60 ? 7 : i % 2 ? 7.5 : 6.5 }));

  it("reads the baselines and that day's TSB", () => {
    const r = readinessOn(day, { hrv, sleep, curve: [{ day, tsb: 0 }] });
    expect(r.tsb).toBe(0);
    // Sleep 7 h at its mean → 50; TSB 0 → 70.
    expect(r.readiness).toMatchObject({ available: true, sleep: { score: 50 }, form: { score: 70 } });
  });

  it("has no score on a day without sleep", () => {
    expect(readinessOn(addDays(day, 1), { hrv, sleep, curve: [{ day: addDays(day, 1), tsb: 0 }] }).readiness).toEqual({ available: false, reason: "sin sueño de anoche" });
  });
});
