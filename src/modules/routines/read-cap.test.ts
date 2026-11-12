import { describe, expect, it } from "vitest";
import { capMessage, nextMonthStart, readsSince, readsThisMonth } from "./read-cap";

describe("readsThisMonth", () => {
  it("counts reads by the person's calendar month, not UTC's", () => {
    // 2026-11-01T03:00Z is still October 31 in Costa Rica (UTC−6).
    const reads = ["2026-11-01T03:00:00Z", "2026-11-01T07:00:00Z", "2026-11-20T15:00:00Z", "2026-10-15T15:00:00Z"];
    expect(readsThisMonth(reads, "2026-11-09", "America/Costa_Rica")).toBe(2);
    expect(readsThisMonth(reads, "2026-11-09", "UTC")).toBe(3);
  });
});

describe("readsSince", () => {
  it("starts a day before the month, so no time zone misses a read", () => {
    expect(readsSince("2026-11-09")).toBe("2026-10-31T00:00:00.000Z");
    expect(readsSince("2026-01-20")).toBe("2025-12-31T00:00:00.000Z");
  });
});

describe("nextMonthStart", () => {
  it("names the first day of next month, wrapping the year", () => {
    expect(nextMonthStart("2026-11-09")).toBe("el 1 de diciembre");
    expect(nextMonthStart("2026-12-31")).toBe("el 1 de enero");
  });

  it("says it in the refusal", () => {
    expect(capMessage("2026-11-09")).toContain("30 lecturas");
    expect(capMessage("2026-11-09")).toContain("el 1 de diciembre");
  });
});
