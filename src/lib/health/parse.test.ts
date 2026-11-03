import { describe, expect, it } from "vitest";
import { splitHealthPayload } from "./parse";

describe("splitHealthPayload", () => {
  it("keys a single-day payload by its archive day and keeps every field", () => {
    expect(splitHealthPayload("sleep_daily", "2024-03-08", { calendarDate: "2024-03-08", anything: 1 })).toEqual([
      { day: "2024-03-08", data: { calendarDate: "2024-03-08", anything: 1 } },
    ]);
  });

  it("splits plain and wrapped range lists into days", () => {
    expect(splitHealthPayload("steps", "2024-01-01", [{ calendarDate: "2024-01-01" }, { calendarDate: "2024-01-02" }]).map((d) => d.day)).toEqual([
      "2024-01-01",
      "2024-01-02",
    ]);
    expect(splitHealthPayload("hrv_summaries", "2024-01-01", { hrvSummaries: [{ calendarDate: "2024-01-05" }], userProfilePk: 1 })[0].day).toBe("2024-01-05");
    expect(splitHealthPayload("daily_summaries", "2024-01-01", { data: [{ calendarDate: "2024-01-06" }] })[0].day).toBe("2024-01-06");
    expect(splitHealthPayload("body_battery", "2024-01-01", [{ date: "2024-01-07" }])[0].day).toBe("2024-01-07");
    expect(splitHealthPayload("weight", "2024-01-01", { dailyWeightSummaries: [{ summaryDate: "2024-01-08" }] })[0].day).toBe("2024-01-08");
  });

  it("skips what it can't place on a day instead of guessing", () => {
    expect(splitHealthPayload("steps", "2024-01-01", [{ totalSteps: 10 }, null, "x"])).toEqual([]);
    expect(splitHealthPayload("hydration", "2024-01-01", [])).toEqual([]);
    expect(splitHealthPayload("sleep_daily", "current", {})).toEqual([]);
    expect(splitHealthPayload("stress", "2024-01-01", null)).toEqual([]);
  });

  it("handles a kind it has never seen, as long as its items carry a day", () => {
    expect(splitHealthPayload("new_stream", "2024-01-01", [{ calendarDate: "2024-01-09" }])[0].day).toBe("2024-01-09");
  });
});
