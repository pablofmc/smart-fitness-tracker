import { describe, expect, it } from "vitest";
import { sportsInGroup, formatDuration, formatKm, formatRowDate, groupByWeek, headline, periodStart, pickPeriod, sportChips, sportGroup, weekLabel, type ListedActivity } from "./list";

const activity = (over: Partial<ListedActivity>): ListedActivity => ({
  id: 1,
  name: "Sesión",
  sport: "running",
  local_day: "2026-10-26",
  duration_s: 3600,
  distance_m: 10000,
  avg_hr: 150,
  exercise_count: null,
  ...over,
});

describe("sportGroup", () => {
  it("joins variants of a sport and keeps unseen sports under Otros", () => {
    expect(sportGroup("treadmill_running")).toBe("Correr");
    expect(sportGroup("underwater_hockey")).toBe("Otros");
  });

  it("compares a sport with its own group, and an ungrouped one only with itself", () => {
    expect(sportsInGroup("treadmill_running")).toContain("running");
    expect(sportsInGroup("underwater_hockey")).toEqual(["underwater_hockey"]);
  });
});

describe("periods", () => {
  it("falls back to four weeks and has no start for the whole history", () => {
    expect(pickPeriod("nada").key).toBe("4s");
    expect(periodStart(pickPeriod("4s"), "2026-11-02")).toBe("2026-10-05");
    expect(periodStart(pickPeriod("todo"), "2026-11-02")).toBeNull();
  });
});

describe("sportChips", () => {
  it("puts the most frequent group first", () => {
    const list = [activity({ sport: "hiit" }), activity({ sport: "running" }), activity({ sport: "treadmill_running" })];
    expect(sportChips(list)).toEqual(["Correr", "HIIT"]);
  });
});

describe("formats", () => {
  it("writes durations, distances and days in Spanish with metric units (R-DAT-05)", () => {
    expect(formatDuration(6720)).toBe("1 h 52 min");
    expect(formatDuration(3660)).toBe("1 h 01 min");
    expect(formatDuration(2880)).toBe("48 min");
    expect(formatKm(18400)).toBe("18,4 km");
    expect(formatRowDate("2026-10-26")).toBe("Lun 26 oct");
  });
});

describe("headline", () => {
  it("picks km, pool metres or exercises, and shows nothing rather than zero", () => {
    expect(headline(activity({}))).toBe("10,0 km");
    expect(headline(activity({ sport: "lap_swimming", distance_m: 1600 }))).toBe("1.600 m");
    expect(headline(activity({ sport: "strength_training", distance_m: 0, exercise_count: 7 }))).toBe("7 ejercicios");
    expect(headline(activity({ sport: "soccer", distance_m: null }))).toBeNull();
  });
});

describe("groupByWeek", () => {
  it("starts weeks on Monday and adds up each one", () => {
    const weeks = groupByWeek(
      [activity({ id: 1, local_day: "2026-11-02" }), activity({ id: 2, local_day: "2026-11-01" }), activity({ id: 3, local_day: "2026-10-26", duration_s: 1800, distance_m: 0 })],
      "2026-11-03",
    );
    expect(weeks.map((week) => week.label)).toEqual(["Esta semana", "Semana del 26 oct"]);
    expect(weeks[1].items.map((item) => item.id)).toEqual([2, 3]);
    expect(weeks[1].total).toBe("10,0 km · 1 h 30 min");
  });

  it("names the year on weeks from another year", () => {
    expect(weekLabel("2024-03-04", "2026-11-03")).toBe("Semana del 4 mar 2024");
  });
});
