import { describe, expect, it } from "vitest";
import { formatWeight, fromUnit, parseWeight, toUnit, weightNumber } from "./units";

describe("weight units", () => {
  it("converts both ways without drift at the shown precision", () => {
    for (const lb of [45, 135, 137.5, 225, 315, 2.5, 167.3]) {
      const kg = fromUnit(lb, "lb");
      expect(Number(weightNumber(kg, "lb").replace(",", "."))).toBe(lb);
    }
    for (const kg of [20, 21, 61.25, 102.5]) expect(fromUnit(toUnit(kg, "lb"), "lb")).toBe(kg);
  });

  it("formats kg up to 2 decimals and lb up to 1", () => {
    expect(formatWeight(61.25, "kg")).toBe("61,25 kg");
    expect(formatWeight(61.235, "lb")).toBe("135 lb");
    expect(formatWeight(80, "lb")).toBe("176,4 lb");
  });
});

describe("parseWeight", () => {
  it("accepts a comma or a point, and the unit after the number", () => {
    expect(parseWeight("21", "kg")).toEqual({ ok: true, kg: 21 });
    expect(parseWeight("21,5", "kg")).toEqual({ ok: true, kg: 21.5 });
    expect(parseWeight(" 21.5 kg ", "kg")).toEqual({ ok: true, kg: 21.5 });
    expect(parseWeight("135 lb", "lb")).toEqual({ ok: true, kg: 61.235 });
    expect(parseWeight("0", "kg")).toEqual({ ok: true, kg: 0 });
  });

  it("refuses empty, non-numeric and out-of-range input", () => {
    expect(parseWeight("", "kg")).toMatchObject({ ok: false, message: "Escribe un peso." });
    expect(parseWeight("veinte", "kg")).toMatchObject({ ok: false });
    expect(parseWeight("-5", "kg")).toMatchObject({ ok: false });
    expect(parseWeight("1,2,3", "kg")).toMatchObject({ ok: false });
    expect(parseWeight("501", "kg")).toMatchObject({ ok: false, message: "El peso va de 0 a 500 kg." });
    expect(parseWeight("1200", "lb")).toMatchObject({ ok: false, message: "El peso va de 0 a 1102 lb." });
    expect(parseWeight("15", "kg", { min: 20, max: 300 })).toMatchObject({ ok: false, message: "El peso va de 20 a 300 kg." });
  });
});
