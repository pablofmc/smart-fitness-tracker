import { describe, expect, it } from "vitest";
import { formatMonthYear, formatRelativeTime, formatShortDate } from "./format";

describe("formatShortDate", () => {
  it("keeps the calendar day, whatever the server's time zone", () => {
    expect(formatShortDate("2026-11-09")).toMatch(/^9 nov 2026$/);
    expect(formatShortDate("2027-01-01")).toMatch(/^1 ene 2027$/);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-11-02T12:00:00Z");

  it("uses the largest whole unit", () => {
    expect(formatRelativeTime("2026-11-02T11:59:50Z", now)).toBe("Actualizado ahora");
    expect(formatRelativeTime("2026-11-02T11:30:00Z", now)).toBe("Actualizado hace 30 min");
    expect(formatRelativeTime("2026-11-02T09:00:00Z", now)).toBe("Actualizado hace 3 h");
    expect(formatRelativeTime("2026-11-01T12:00:00Z", now)).toBe("Actualizado hace 1 día");
  });
});

describe("formatMonthYear", () => {
  it("spells the month in Spanish", () => {
    expect(formatMonthYear("2023-03-14")).toBe("marzo de 2023");
  });
});
