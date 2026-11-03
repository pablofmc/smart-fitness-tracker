import { describe, expect, it } from "vitest";
import { recentSportOrder } from "./recent";

describe("recentSportOrder (R-ACT-04)", () => {
  const today = "2026-11-03";
  const base = [
    { day: "2026-10-20", sport: "running" },
    { day: "2026-10-22", sport: "running" },
    { day: "2026-10-25", sport: "cycling" },
  ];

  it("moves cycling up once you ride more, with no setting changed", () => {
    expect(recentSportOrder(base, today).map((s) => s.group)).toEqual(["Correr", "Ciclismo"]);
    const moreCycling = [...base, { day: "2026-10-28", sport: "cycling" }, { day: "2026-11-01", sport: "indoor_cycling" }];
    expect(recentSportOrder(moreCycling, today).map((s) => s.group)).toEqual(["Ciclismo", "Correr"]);
  });

  it("ignores sessions older than the window", () => {
    expect(recentSportOrder([{ day: "2026-01-01", sport: "hiking" }], today)).toEqual([]);
  });
});
