export const STRENGTH_UNITS = ["mg", "g", "mcg", "ml", "%", "IU"] as const;
export type StrengthUnit = (typeof STRENGTH_UNITS)[number];

export function formatStrength(value: number, unit: string) {
  if (!value || value <= 0) return "";
  return `${value} ${unit}`.trim();
}

export function parseStrength(raw: string): { value: number; unit: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: 0, unit: "mg" };
  const match = trimmed.match(/^([\d.]+)\s*([a-zA-Z%]+)?/);
  if (!match) return { value: 0, unit: "mg" };
  const unit = match[2] || "mg";
  return { value: Number(match[1]) || 0, unit: STRENGTH_UNITS.includes(unit as StrengthUnit) ? unit : "mg" };
}

export function resolveStrengthFields(medicine: {
  strength?: string;
  strengthValue?: number;
  strengthUnit?: string;
}) {
  if (medicine.strengthValue && medicine.strengthValue > 0 && medicine.strengthUnit) {
    return {
      value: medicine.strengthValue,
      unit: medicine.strengthUnit,
      label: formatStrength(medicine.strengthValue, medicine.strengthUnit),
    };
  }
  const parsed = parseStrength(medicine.strength || "");
  return {
    value: parsed.value,
    unit: parsed.unit,
    label: medicine.strength || formatStrength(parsed.value, parsed.unit),
  };
}

/** Inferred inventory unit when the user does not pick one in the form. */
export function inferMedicineUnit(strengthUnit: string) {
  if (strengthUnit === "ml") return "Bottle";
  if (strengthUnit === "%") return "Cream";
  return "Tablet";
}

export function usesStripByStrengthUnit(strengthUnit: string) {
  return strengthUnit === "mg" || strengthUnit === "g" || strengthUnit === "mcg" || strengthUnit === "IU";
}
