import { describe, expect, it } from "vitest";
import { weeklyLoad } from "./weekly";

describe("weeklyLoad", () => {
  it("adds zones and splits TRIMP by sport per week, keeping empty weeks", () => {
    const weeks = weeklyLoad(
      [
        { day: "2026-10-27", sport: "running", trimp: 50, zoneSeconds: [60, 0, 0, 0, 0] },
        { day: "2026-10-28", sport: "strength_training", trimp: 20, zoneSeconds: [30, 30, 0, 0, 0] },
        { day: "2026-10-29", sport: "treadmill_running", trimp: 10, zoneSeconds: null },
        { day: "2026-11-02", sport: "running", trimp: null, zoneSeconds: null },
      ],
      "2026-10-20",
      "2026-11-03",
    );
    expect(weeks.map((w) => w.monday)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(weeks[1].zones).toEqual([90, 30, 0, 0, 0]);
    expect(weeks[1].bySport).toEqual({ Correr: 60, Fuerza: 20 });
    expect(weeks[2].bySport).toEqual({});
  });
});
