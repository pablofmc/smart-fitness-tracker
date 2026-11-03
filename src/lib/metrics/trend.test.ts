import { describe, expect, it } from "vitest";
import { bucketMeans } from "./trend";

const series = [
  { day: "2025-12-29", value: 10 },
  { day: "2026-01-04", value: 20 },
  { day: "2026-01-05", value: 30 },
  { day: "2026-02-01", value: 40 },
];

describe("bucketMeans", () => {
  it("averages by Monday-start week, month and year", () => {
    expect(bucketMeans(series, "semanas")).toEqual([
      { bucket: "2025-12-29", mean: 15, days: 2 },
      { bucket: "2026-01-05", mean: 30, days: 1 },
      { bucket: "2026-01-26", mean: 40, days: 1 },
    ]);
    expect(bucketMeans(series, "meses").map((b) => [b.bucket, b.mean])).toEqual([
      ["2025-12", 10],
      ["2026-01", 25],
      ["2026-02", 40],
    ]);
    expect(bucketMeans(series, "años").map((b) => [b.bucket, b.mean])).toEqual([
      ["2025", 10],
      ["2026", 30],
    ]);
  });
});
