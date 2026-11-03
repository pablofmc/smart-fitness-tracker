import { describe, expect, it } from "vitest";
import { chartSeries, lapRows, type FitRecord } from "./fit";

const at = (seconds: number) => new Date(Date.UTC(2026, 0, 1) + seconds * 1000);

const run: FitRecord[] = Array.from({ length: 600 }, (_, i) => ({
  timestamp: at(i),
  heartRate: 140,
  enhancedSpeed: i < 10 ? 0 : 1000 / 300, // 5:00 /km after a standing start
  enhancedAltitude: 50,
  cadence: 85,
  fractionalCadence: 0.5,
}));

describe("chartSeries", () => {
  it("gives a run its four charts in metric units", () => {
    const series = chartSeries(run, { speedAsPace: true, maxPoints: 60 });
    expect(series.map((s) => s.key)).toEqual(["hr", "pace", "altitude", "cadence"]);
    const pace = series.find((s) => s.key === "pace")!;
    expect(pace.points.length).toBeLessThanOrEqual(60);
    expect(pace.points.every((p) => Math.abs(p.v - 5) < 1e-9)).toBe(true); // standing seconds are left out
    expect(series.find((s) => s.key === "cadence")!.points[0].v).toBe(171);
  });

  it("uses km/h when the sport is measured by speed", () => {
    const keys = chartSeries(run, { speedAsPace: false }).map((s) => s.key);
    expect(keys).toContain("speed");
    expect(keys).not.toContain("pace");
  });

  it("leaves out metrics the file doesn't have, with no sport-specific code", () => {
    const swim = Array.from({ length: 100 }, (_, i) => ({ timestamp: at(i), heartRate: 120 }));
    expect(chartSeries(swim, { speedAsPace: true }).map((s) => s.key)).toEqual(["hr"]);
    expect(chartSeries([], { speedAsPace: true })).toEqual([]);
  });
});

describe("lapRows", () => {
  it("doubles running cadence and keeps missing values missing", () => {
    expect(lapRows([{ totalDistance: 1000, totalTimerTime: 300, enhancedAvgSpeed: 3.33, avgHeartRate: 150, avgRunningCadence: 86 }])).toEqual([
      { distance_m: 1000, time_s: 300, speed: 3.33, hr: 150, cadence: 172 },
    ]);
    expect(lapRows([{}])).toEqual([{ distance_m: null, time_s: null, speed: null, hr: null, cadence: null }]);
  });
});
