import { describe, expect, it } from "vitest";
import { assignRuns } from "./assign";

const shoe = { id: 7, createdAt: "2026-11-06T12:00:00Z" };
const run = (id: number, startedAt: string | null) => ({ id, startedAt });

describe("assignRuns", () => {
  it("gives a run started after registering to the default shoe", () => {
    expect(assignRuns([run(1, "2026-11-07T08:00:00Z")], new Set(), shoe)).toEqual([{ activity_id: 1, shoe_id: 7 }]);
  });

  it("leaves runs from before the shoe was registered with no shoe", () => {
    expect(assignRuns([run(1, "2026-11-06T07:00:00Z"), run(2, "2025-01-01T07:00:00Z")], new Set(), shoe)).toEqual([
      { activity_id: 1, shoe_id: null },
      { activity_id: 2, shoe_id: null },
    ]);
  });

  it("records new runs with no shoe when there is no default", () => {
    expect(assignRuns([run(1, "2026-11-07T08:00:00Z")], new Set(), null)).toEqual([{ activity_id: 1, shoe_id: null }]);
  });

  it("never touches a run already decided", () => {
    expect(assignRuns([run(1, "2026-11-07T08:00:00Z"), run(2, "2026-11-08T08:00:00Z")], new Set([1]), shoe)).toEqual([{ activity_id: 2, shoe_id: 7 }]);
  });

  it("treats a run with no start time as from before", () => {
    expect(assignRuns([run(1, null)], new Set(), shoe)).toEqual([{ activity_id: 1, shoe_id: null }]);
  });

  it("counts a run starting the same instant as the registration", () => {
    expect(assignRuns([run(1, shoe.createdAt)], new Set(), shoe)).toEqual([{ activity_id: 1, shoe_id: 7 }]);
  });
});
