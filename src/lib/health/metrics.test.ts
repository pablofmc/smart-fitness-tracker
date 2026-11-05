import { describe, expect, it } from "vitest";
import { combineSources, metricByKey, metricSeries } from "./metrics";

describe("metricSeries", () => {
  it("prefers the daily payload and falls back to the range summary", () => {
    const hrv = metricByKey("hrv")!;
    const series = metricSeries(hrv, [
      { kind: "hrv_summaries", day: "2026-01-01", data: { lastNightAvg: 50 } },
      { kind: "hrv_summaries", day: "2026-01-02", data: { lastNightAvg: 51 } },
      { kind: "hrv_daily", day: "2026-01-02", data: { hrvSummary: { lastNightAvg: 52 } } },
    ]);
    expect(series).toEqual([
      { day: "2026-01-01", value: 50 },
      { day: "2026-01-02", value: 52 },
    ]);
  });

  it("converts units and leaves missing or zero readings out", () => {
    const sleep = metricByKey("sleep")!;
    expect(
      metricSeries(sleep, [
        { kind: "sleep_daily", day: "2026-01-01", data: { sleepTimeSeconds: 27000 } },
        { kind: "sleep_daily", day: "2026-01-02", data: { sleepTimeSeconds: 0 } },
        { kind: "sleep_daily", day: "2026-01-03", data: { sleepTimeSeconds: null } },
      ]),
    ).toEqual([{ day: "2026-01-01", value: 7.5 }]);
  });

  it("reads nested daily summary fields", () => {
    expect(metricSeries(metricByKey("restingHr")!, [{ kind: "daily_summaries", day: "2026-01-01", data: { heartRate: { restingValue: 48 } } }])).toEqual([{ day: "2026-01-01", value: 48 }]);
    expect(metricSeries(metricByKey("intensityMinutes")!, [{ kind: "daily_summaries", day: "2026-01-01", data: { intensityMinutes: { moderate: 10, vigorous: 5 } } }])[0].value).toBe(20);
  });

  it("combines per-field reads the same way", () => {
    const hrv = metricByKey("hrv")!;
    expect(combineSources(hrv, [[{ day: "2026-01-02", raw: 52 }], [{ day: "2026-01-01", raw: 50 }, { day: "2026-01-02", raw: 51 }]])).toEqual([
      { day: "2026-01-01", value: 50 },
      { day: "2026-01-02", value: 52 },
    ]);
  });
});
