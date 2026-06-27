/**
 * Weight unit conversions. All internal calculations use GRAMS.
 * These are pure functions — easy to unit test, no side effects.
 */
import {
  GRAMS_PER_TOLA,
  GRAMS_PER_MASHA,
  GRAMS_PER_TEN_GRAM,
  GRAMS_PER_KG,
  MASHA_PER_TOLA,
  type WeightUnit,
} from "./constants";

export const tolaToGrams = (tola: number): number => tola * GRAMS_PER_TOLA;
export const gramsToTola = (g: number): number => g / GRAMS_PER_TOLA;

export const mashaToGrams = (masha: number): number => masha * GRAMS_PER_MASHA;
export const gramsToMasha = (g: number): number => g / GRAMS_PER_MASHA;

export const tenGramToGrams = (x: number): number => x * GRAMS_PER_TEN_GRAM;
export const gramsToTenGram = (g: number): number => g / GRAMS_PER_TEN_GRAM;

// Kilogram conversions — used for silver/chandi, which is often quoted per kg.
export const kgToGrams = (kg: number): number => kg * GRAMS_PER_KG;
export const gramsToKg = (g: number): number => g / GRAMS_PER_KG;

/** Convert any supported unit to grams. */
export function toGrams(value: number, unit: WeightUnit): number {
  switch (unit) {
    case "tola":
      return tolaToGrams(value);
    case "masha":
      return mashaToGrams(value);
    case "kg":
      return kgToGrams(value);
    case "gram":
      return value;
  }
}

/** Convert grams to any supported unit. */
export function fromGrams(grams: number, unit: WeightUnit): number {
  switch (unit) {
    case "tola":
      return gramsToTola(grams);
    case "masha":
      return gramsToMasha(grams);
    case "kg":
      return gramsToKg(grams);
    case "gram":
      return grams;
  }
}

/**
 * Break a gram weight into the traditional Tola / Masha / Ratti display
 * that older customers and jewellers expect to see on a slip.
 * Example: 13.6 g -> 1 tola, 2 masha, ... (remainder kept in grams).
 */
export function toTolaMashaBreakdown(grams: number): {
  tola: number;
  masha: number;
  remainderGrams: number;
} {
  const tola = Math.floor(grams / GRAMS_PER_TOLA);
  let rest = grams - tola * GRAMS_PER_TOLA;
  const masha = Math.floor(rest / GRAMS_PER_MASHA);
  rest = rest - masha * GRAMS_PER_MASHA;
  return { tola, masha, remainderGrams: round3(rest) };
}

/** Round a weight to 3 decimals (milligram precision) — never lose gold to floats. */
export const round3 = (n: number): number => Math.round((n + Number.EPSILON) * 1000) / 1000;

export { MASHA_PER_TOLA };
