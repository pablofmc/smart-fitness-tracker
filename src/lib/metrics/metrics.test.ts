import { describe, expect, it } from "vitest";
import { dailyLoads, formCurve } from "./form";
import { intervals, settingsFor, type HrSettings } from "./hr";
import { trimp } from "./trimp";
import { timeInZones, zoneEdges, zoneOf } from "./zones";

const settings: HrSettings = { id: 1, effectiveFrom: "2024-01-01", maxHr: 190, restingHr: 50, lthr: 170 };
/** Samples every 10 s for `seconds`, all at one HR. */
const steady = (hr: number, seconds: number, from = 0) => Array.from({ length: seconds / 10 + 1 }, (_, i) => ({ t: from + i * 10, hr }));

describe("settingsFor (R-LOAD-05)", () => {
  const versions = [settings, { ...settings, id: 2, effectiveFrom: "2026-11-03", maxHr: 185 }];
  it("uses the version in effect on the day, so a change today leaves past days alone", () => {
    expect(settingsFor("2026-11-02", versions)?.id).toBe(1);
    expect(settingsFor("2026-11-03", versions)?.id).toBe(2);
    expect(settingsFor("2023-12-31", versions)).toBeNull();
  });
});

describe("intervals", () => {
  it("drops gaps over 30 s and the last sample", () => {
    expect(intervals([{ t: 0, hr: 100 }, { t: 10, hr: 100 }, { t: 50, hr: 100 }, { t: 60, hr: 100 }])).toEqual([
      { hr: 100, seconds: 10 },
      { hr: 100, seconds: 10 },
    ]);
  });
});

describe("trimp (golden, computed by hand)", () => {
  it("one minute at HRr 0.5 is 0.5 × 0.64 × e^0.96 = 0.835743", () => {
    const result = trimp(steady(120, 60), settings);
    expect(result.available && result.value).toBeCloseTo(0.835743, 5);
    expect(result.available && result.minutes).toBe(1);
  });

  it("clamps HR above max to HRr 1: 0.64 × e^1.92 = 4.3654 per minute", () => {
    const result = trimp(steady(200, 120), settings);
    expect(result.available && result.value).toBeCloseTo(2 * 0.64 * Math.exp(1.92), 6);
    expect(result.available && result.value).toBeCloseTo(8.7308, 3);
  });

  it("a pause adds nothing", () => {
    const withPause = [...steady(120, 60), ...steady(120, 60, 600)];
    const result = trimp(withPause, settings);
    expect(result.available && result.value).toBeCloseTo(2 * 0.835743, 5);
  });

  it("says why when it can't compute, and never returns zero", () => {
    expect(trimp([], settings)).toEqual({ available: false, reason: "Sin datos de FC" });
    expect(trimp(steady(120, 60), null)).toEqual({ available: false, reason: "Sin umbrales de FC para esa fecha" });
  });
});

describe("zones (golden, LTHR 170)", () => {
  it("cuts at 85, 90, 95 and 100 % of LTHR", () => {
    expect(zoneEdges(170)).toEqual([145, 153, 162, 170]);
    expect([144, 145, 152, 153, 161, 162, 169, 170].map((hr) => zoneOf(hr, 170))).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });

  it("adds up time per zone", () => {
    const result = timeInZones([...steady(140, 60), ...steady(171, 30, 70)], settings);
    expect(result.available && result.seconds).toEqual([70, 0, 0, 0, 30]);
  });
});

describe("formCurve (golden)", () => {
  it("follows the 42- and 7-day recurrences, with TSB from yesterday", () => {
    const [d0, d1] = formCurve([{ day: "2024-01-01", load: 100 }], "2024-01-02");
    expect(d0.ctl).toBeCloseTo(100 / 42, 6);
    expect(d0.atl).toBeCloseTo(100 / 7, 6);
    expect(d0.tsb).toBe(0);
    expect(d1.load).toBe(0);
    expect(d1.ctl).toBeCloseTo(100 / 42 - 100 / 42 / 42, 6);
    expect(d1.atl).toBeCloseTo(100 / 7 - 100 / 7 / 7, 6);
    expect(d1.tsb).toBeCloseTo(100 / 42 - 100 / 7, 6);
  });

  it("adds every sport of a day into one load (R-LOAD-02)", () => {
    expect(dailyLoads([{ day: "2024-01-02", trimp: 40 }, { day: "2024-01-01", trimp: 10 }, { day: "2024-01-02", trimp: 60 }])).toEqual([
      { day: "2024-01-01", load: 10 },
      { day: "2024-01-02", load: 100 },
    ]);
  });

  it("is empty with no data", () => {
    expect(formCurve([], "2024-01-01")).toEqual([]);
  });
});
