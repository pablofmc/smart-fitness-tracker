import { describe, expect, it } from "vitest";
import { explorerOptions, explorerSentence, formatValue, inSentence, lagText, readChoice, trendLine } from "./explorer";

const options = explorerOptions(["Alcohol"]);

describe("readChoice", () => {
  it("reads known keys and a lag from the URL", () => {
    const c = readChoice({ x: "tag:Alcohol", y: "hrv", lag: "1" }, options);
    expect([c.x.key, c.y.key, c.lag]).toEqual(["tag:Alcohol", "hrv", 1]);
  });

  it("falls back to the default for unknown keys, a tag on Y and a lag out of range", () => {
    const c = readChoice({ x: "nope", y: "tag:Alcohol", lag: "9" }, options);
    expect([c.x.key, c.y.key, c.lag]).toEqual(["sleep", "paceAtHr", 1]);
    expect(readChoice({ lag: "1.5" }, options).lag).toBe(1);
    expect(readChoice({ lag: "0" }, options).lag).toBe(0);
  });
});

describe("explorerSentence", () => {
  const choice = readChoice({ x: "sleep", y: "paceAtHr", lag: "1" }, options);

  it("says how Y moves, in the words the metric needs", () => {
    expect(explorerSentence(choice, { enough: true, rho: -0.45, n: 128, strength: "moderada" })).toBe(
      "Relación moderada en 128 días: cuando sueño sube, ritmo a FC fija es más rápido al día siguiente.",
    );
    const hrv = readChoice({ x: "load", y: "hrv", lag: "0" }, options);
    expect(explorerSentence(hrv, { enough: true, rho: 0.3, n: 40, strength: "débil" })).toBe("Relación débil en 40 días: cuando carga (TRIMP) sube, HRV sube ese mismo día.");
  });

  it("gives no direction when the relation is very weak or the data short", () => {
    expect(explorerSentence(choice, { enough: true, rho: 0.1, n: 50, strength: "muy débil" })).toBe("Sin relación clara en 50 días.");
    expect(explorerSentence(choice, { enough: false, n: 12, reason: "datos insuficientes" })).toBe("Datos insuficientes: 12 días emparejados. Hacen falta unos 30.");
  });
});

describe("helpers", () => {
  it("keeps acronyms capitalised inside a sentence", () => {
    expect(["Sueño", "HRV", "FC en reposo", "Carga (TRIMP)"].map(inSentence)).toEqual(["sueño", "HRV", "FC en reposo", "carga (TRIMP)"]);
  });

  it("names the lag", () => {
    expect([0, 1, 3].map(lagText)).toEqual(["ese mismo día", "al día siguiente", "3 días después"]);
  });

  it("fits y = 2x + 1 exactly and gives no line when x never varies", () => {
    expect(trendLine([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])).toEqual({ slope: 2, intercept: 1 });
    expect(trendLine([{ x: 1, y: 1 }, { x: 1, y: 2 }])).toBeNull();
  });
});

describe("formatValue", () => {
  it("writes hours, paces and plain numbers", () => {
    expect(formatValue(7.999, "h")).toBe("8 h 00");
    expect(formatValue(330.4, "s/km")).toBe("5:30 /km");
    expect(formatValue(54.6, "ms")).toBe("55 ms");
    expect(formatValue(3.25, "")).toBe("3,3");
  });
});
