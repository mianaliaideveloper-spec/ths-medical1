import { resolveStrengthFields, usesStripByStrengthUnit } from "@/lib/strength";
import type { Medicine } from "@/lib/types";

export function usesStripPack(unit: string) {
  return unit === "Tablet" || unit === "Capsule";
}

export function medicineUsesStrip(medicine: Pick<Medicine, "unit" | "strength" | "strengthValue" | "strengthUnit">) {
  const { unit: strengthUnit } = resolveStrengthFields(medicine);
  if (usesStripByStrengthUnit(strengthUnit)) return true;
  return usesStripPack(medicine.unit);
}

export function defaultTabletsPerStrip(unit: string) {
  return usesStripPack(unit) ? 10 : 1;
}

export function resolveTabletsPerStrip(medicine: Pick<Medicine, "unit" | "tabletsPerStrip">) {
  if (medicine.tabletsPerStrip && medicine.tabletsPerStrip > 0) return medicine.tabletsPerStrip;
  return defaultTabletsPerStrip(medicine.unit);
}

export function resolveDoseTablets(medicine: Pick<Medicine, "doseTablets">) {
  return medicine.doseTablets && medicine.doseTablets > 0 ? medicine.doseTablets : 0;
}

export type StripSale = {
  stripCount: number;
  tabletsPerStrip: number;
  totalTablets: number;
  doseTablets: number;
};

export function calcStripSale(stripCount: number, tabletsPerStrip: number, doseTablets = 0): StripSale {
  const strips = Math.max(0, Math.floor(stripCount));
  const perStrip = Math.max(1, Math.floor(tabletsPerStrip));
  return {
    stripCount: strips,
    tabletsPerStrip: perStrip,
    totalTablets: strips * perStrip,
    doseTablets: Math.max(0, Math.floor(doseTablets)),
  };
}
