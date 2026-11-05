import { describe, expect, it } from "vitest";
import type { Baseline } from "./baseline";
import { activityVerdict, dayVerdict } from "./verdict";

const at = (position: "below" | "within" | "above"): Baseline => ({ available: true, value: 50, low: 45, high: 60, mean: 52, position, inputs: { rangeDays: 60, recentDays: 7, window: "" } });
const none: Baseline = { available: false, reason: "sin línea base aún" };

describe("dayVerdict", () => {
  it("checks the rules in order and names the one it used", () => {
    expect(dayVerdict({ hrv: at("below"), sleep: at("below"), tsb: -40 }).rule).toMatch(/^1 /);
    expect(dayVerdict({ hrv: at("within"), sleep: at("below"), tsb: -40 }).rule).toMatch(/^2 /);
    expect(dayVerdict({ hrv: at("within"), sleep: at("below"), tsb: 0 }).rule).toMatch(/^3 /);
    expect(dayVerdict({ hrv: at("above"), sleep: at("within"), tsb: -10 }).rule).toMatch(/^4 /);
    expect(dayVerdict({ hrv: at("above"), sleep: at("within"), tsb: -11 }).rule).toMatch(/^5 /);
    expect(dayVerdict({ hrv: none, sleep: none, tsb: null }).rule).toMatch(/^5 /);
  });

  it("lists every input it read, including the missing ones", () => {
    const verdict = dayVerdict({ hrv: none, sleep: at("within"), tsb: null });
    expect(verdict.inputs).toEqual(["HRV 7 días: sin línea base aún", "Sueño anoche 50 h (rango 45–60)", "Forma (TSB): sin carga calculada"]);
  });
});

describe("activityVerdict", () => {
  it("compares TRIMP with the sport's mean", () => {
    expect(activityVerdict({ trimp: 130, previous: [100, 100, 100], group: "Correr" })?.rule).toMatch(/^A1/);
    expect(activityVerdict({ trimp: 70, previous: [100, 100, 100], group: "Correr" })?.rule).toMatch(/^A2/);
    expect(activityVerdict({ trimp: 100, previous: [100, 100, 100], group: "Correr" })?.rule).toMatch(/^A3/);
    expect(activityVerdict({ trimp: 100, previous: [100], group: "Correr" })?.rule).toMatch(/^A0/);
    expect(activityVerdict({ trimp: null, previous: [], group: "Correr" })).toBeNull();
  });
});
