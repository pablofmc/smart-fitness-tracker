import { describe, expect, it } from "vitest";
import { addDays, historyFraction, RANGE_STREAMS, windowEnd, windowStart } from "./streams";

describe("windowStart", () => {
  it("puts every day of a window on the same key", () => {
    expect(windowStart("2022-11-01", 28)).toBe("2022-11-01");
    expect(windowStart("2022-11-28", 28)).toBe("2022-11-01");
    expect(windowStart("2022-11-29", 28)).toBe("2022-11-29");
  });

  it("gives one-day streams one window per day", () => {
    expect(windowStart("2024-02-29", 1)).toBe("2024-02-29");
  });
});

describe("windowEnd", () => {
  it("stays within the largest window Garmin accepts", () => {
    for (const stream of RANGE_STREAMS) {
      const start = windowStart("2024-05-05", stream.maxDays);
      const days = (Date.parse(windowEnd(start, stream.maxDays, "2030-01-01")) - Date.parse(start)) / 86_400_000 + 1;
      expect(days).toBe(stream.maxDays);
    }
  });

  it("never asks for the future", () => {
    expect(windowEnd("2026-10-20", 28, "2026-11-02")).toBe("2026-11-02");
  });
});

describe("addDays", () => {
  it("crosses month ends and leap days", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  });
});

describe("historyFraction", () => {
  it("runs from 0 at the start of history to 1 today", () => {
    expect(historyFraction(null, "2026-11-02")).toBe(0);
    expect(historyFraction("2022-11-01", "2026-11-02")).toBe(0);
    expect(historyFraction("2026-11-02", "2026-11-02")).toBe(1);
  });
});
