import { describe, expect, it } from "vitest";
import { shoeWear, warningVisibleInToday } from "./wear";

describe("shoeWear", () => {
  it("warns from 90 % of the limit", () => {
    expect(shoeWear(629, 700).warn).toBe(false);
    expect(shoeWear(630, 700)).toEqual({ percent: 90, warn: true, leftKm: 70 });
  });

  it("keeps counting past the limit with nothing left", () => {
    expect(shoeWear(760, 700)).toEqual({ percent: 109, warn: true, leftKm: 0 });
  });

  it("rounds the percent", () => {
    expect(shoeWear(641, 700).percent).toBe(92);
  });
});

describe("warningVisibleInToday", () => {
  it("shows a warning nobody hid", () => {
    expect(warningVisibleInToday(true, null, "2026-11-06")).toBe(true);
  });

  it("hides it through the last hidden day, inclusive", () => {
    expect(warningVisibleInToday(true, "2026-11-13", "2026-11-13")).toBe(false);
    expect(warningVisibleInToday(true, "2026-11-13", "2026-11-14")).toBe(true);
  });

  it("never shows below 90 %", () => {
    expect(warningVisibleInToday(false, null, "2026-11-06")).toBe(false);
  });
});
