import { describe, expect, it } from "vitest";
import { parseActivitySummary } from "./parse";

const summary = {
  activityId: 42,
  activityName: "Rodaje",
  activityType: { typeKey: "running" },
  startTimeLocal: "2026-03-01 23:30:00",
  startTimeGMT: "2026-03-02 05:30:00",
  duration: 3600.5,
  movingDuration: 3500,
  distance: 10000,
  averageHR: 150,
  maxHR: 170,
  someNewField: "kept",
};

describe("parseActivitySummary", () => {
  it("places the activity on the watch's local day, not the UTC one (R-DAT-04)", () => {
    const parsed = parseActivitySummary(summary);
    expect(parsed?.local_day).toBe("2026-03-01");
    expect(parsed?.started_at).toBe("2026-03-02T05:30:00Z");
  });

  it("keeps every field of the payload (R-DAT-03)", () => {
    expect(parseActivitySummary(summary)?.data.someNewField).toBe("kept");
  });

  it("saves a sport it has never seen (R-ACT-01)", () => {
    expect(parseActivitySummary({ ...summary, activityType: { typeKey: "underwater_hockey" } })?.sport).toBe("underwater_hockey");
    expect(parseActivitySummary({ ...summary, activityType: undefined })?.sport).toBe("unknown");
  });

  it("treats missing or malformed measures as missing, never zero", () => {
    const parsed = parseActivitySummary({ ...summary, averageHR: undefined, distance: "lejos" });
    expect(parsed?.avg_hr).toBeNull();
    expect(parsed?.distance_m).toBeNull();
    expect(parsed?.duration_s).toBe(3600.5);
  });

  it("counts exercises only when the payload lists them", () => {
    expect(parseActivitySummary(summary)?.exercise_count).toBeNull();
    expect(parseActivitySummary({ ...summary, summarizedExerciseSets: [{}, {}] })?.exercise_count).toBe(2);
  });

  it("rejects a payload it can't identify or place on a day", () => {
    expect(parseActivitySummary({ ...summary, activityId: undefined })).toBeNull();
    expect(parseActivitySummary({ ...summary, startTimeLocal: "ayer" })).toBeNull();
    expect(parseActivitySummary(null)).toBeNull();
  });
});
