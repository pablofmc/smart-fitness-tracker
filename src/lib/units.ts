/**
 * Weight units (R-DAT-05 as amended by #66): weights are stored in kg; a person may see and type them in
 * lb. Distances and paces stay metric. Pure: no React, no Supabase.
 */

export type WeightUnit = "kg" | "lb";
export const WEIGHT_UNITS: WeightUnit[] = ["kg", "lb"];
export const LB_PER_KG = 2.2046226218;

export const parseUnit = (value: unknown): WeightUnit => (value === "lb" ? "lb" : "kg");

/** kg → the unit shown, unrounded. */
export const toUnit = (kg: number, unit: WeightUnit) => (unit === "lb" ? kg * LB_PER_KG : kg);

/** A value in the unit → kg to store, at 3 decimals, so lb → kg → lb comes back to the same 0.1 lb. */
export const fromUnit = (value: number, unit: WeightUnit) => Math.round((unit === "lb" ? value / LB_PER_KG : value) * 1000) / 1000;

const KG_FORMAT = new Intl.NumberFormat("es", { maximumFractionDigits: 2 });
const LB_FORMAT = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

/** The number alone: kg up to 2 decimals (1,25 plates), lb up to 1. */
export const weightNumber = (kg: number, unit: WeightUnit) => (unit === "lb" ? LB_FORMAT : KG_FORMAT).format(toUnit(kg, unit));

/** "61,25 kg", "135 lb". */
export const formatWeight = (kg: number, unit: WeightUnit) => `${weightNumber(kg, unit)} ${unit}`;

/** A number already in the unit, for the calculator: "77,5", "135". */
export const formatInUnit = (value: number, unit: WeightUnit) => (unit === "lb" ? LB_FORMAT : KG_FORMAT).format(value);

/** What a typed weight may be, in kg. */
export const SET_WEIGHT_KG = { min: 0, max: 500 };
export const BODY_WEIGHT_KG = { min: 20, max: 300 };

export type ParsedWeight = { ok: true; kg: number } | { ok: false; message: string };

/**
 * A typed weight: "21", "21,5", "21.5", with or without the unit after it. Returns kg, or why it's refused.
 */
export function parseWeight(text: string, unit: WeightUnit, range: { min: number; max: number } = SET_WEIGHT_KG): ParsedWeight {
  const clean = text.trim().toLowerCase().replace(new RegExp(`\\s*${unit}$`), "").replace(",", ".");
  if (!clean) return { ok: false, message: "Escribe un peso." };
  if (!/^\d+(\.\d+)?$/.test(clean)) return { ok: false, message: "Escribe solo el número, por ejemplo 21 o 21,5." };
  const kg = fromUnit(Number(clean), unit);
  if (kg < range.min || kg > range.max) {
    const lo = Math.round(toUnit(range.min, unit));
    const hi = Math.round(toUnit(range.max, unit));
    return { ok: false, message: `El peso va de ${lo} a ${hi} ${unit}.` };
  }
  return { ok: true, kg };
}

/** The bar, the rounding step and the plates of each unit, for the calculator and the − / + buttons. */
export const LOAD_SPEC: Record<WeightUnit, { bar: number; step: number; plates: readonly number[] }> = {
  kg: { bar: 20, step: 2.5, plates: [25, 20, 15, 10, 5, 2.5, 1.25] },
  lb: { bar: 45, step: 5, plates: [45, 35, 25, 10, 5, 2.5] },
};
