import { usesStripPack } from "@/lib/pack";
import {
  formatStrength,
  inferMedicineUnit,
  parseStrength,
  resolveStrengthFields,
  usesStripByStrengthUnit,
} from "@/lib/strength";
import { STORE_LABEL } from "@/lib/branding";
import type { Medicine, MedicineInput } from "@/lib/types";

function autoBatchNumber() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `THS${stamp}-${suffix}`;
}

/** Fills hidden fields (batch, unit, manufacturer, shelf) before save. */
export function prepareMedicineForSave(input: MedicineInput, existing?: Medicine): MedicineInput {
  const strength = resolveStrengthFields(input);
  const strengthUnit = strength.unit;
  const strengthValue = strength.value;
  const unit = input.unit?.trim() || existing?.unit || inferMedicineUnit(strengthUnit);
  const strip = usesStripPack(unit) || usesStripByStrengthUnit(strengthUnit);
  const reorderLevel = existing?.reorderLevel ?? (Number(input.reorderLevel) > 0 ? Number(input.reorderLevel) : 20);

  return {
    ...input,
    strength:
      strengthValue > 0
        ? formatStrength(strengthValue, strengthUnit) || input.strength.trim()
        : existing?.strength || input.strength.trim() || "",
    strengthValue: strengthValue > 0 ? strengthValue : existing?.strengthValue || 0,
    strengthUnit: strengthValue > 0 ? strengthUnit : existing?.strengthUnit || strengthUnit,
    unit,
    reorderLevel,
    shelf: "",
    batchNumber: existing?.batchNumber?.trim() || input.batchNumber?.trim() || autoBatchNumber(),
    manufacturingDate: input.manufacturingDate || existing?.manufacturingDate || "",
    tabletsPerStrip: strip ? Math.max(1, Number(input.tabletsPerStrip) || 10) : 1,
    doseTablets: 0,
    storeLabel: STORE_LABEL,
    manufacturer: STORE_LABEL,
  };
}

export function medicineFromCatalog(row: {
  strength: string;
  unit: string;
  manufacturer?: string;
  batchNumber?: string;
  shelf?: string;
  [key: string]: unknown;
}) {
  const parsed = parseStrength(row.strength);
  const strengthUnit = parsed.unit;
  const unit = inferMedicineUnit(strengthUnit);
  const strip = usesStripByStrengthUnit(strengthUnit);
  return {
    strengthValue: parsed.value,
    strengthUnit,
    strength: formatStrength(parsed.value, strengthUnit),
    unit,
    shelf: "",
    storeLabel: STORE_LABEL,
    manufacturer: STORE_LABEL,
    batchNumber: typeof row.batchNumber === "string" ? row.batchNumber : autoBatchNumber(),
    manufacturingDate: "",
    tabletsPerStrip: strip ? 10 : 1,
    doseTablets: 0,
  };
}
