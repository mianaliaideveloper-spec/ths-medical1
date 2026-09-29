import { PRINT_FEE_PER_DAY_PKR } from "@/lib/branding";
import { formatPkr } from "@/lib/format";
import { medicineUsesStrip, resolveDoseTablets, resolveTabletsPerStrip } from "@/lib/pack";
import type { Medicine } from "@/lib/types";

export type MedicinePrintInput =
  | { mode: "unit"; unitQty: number }
  | {
      mode: "tablets";
      tabletQuantity: number;
      tabletsPerStrip?: number;
      doseTablets?: number;
    };

export type BillLine = {
  medicineName: string;
  genericName: string;
  strength: string;
  stripCount: number;
  tabletsPerStrip: number;
  totalTablets: number;
  doseTablets: number;
  unitQty: number;
  unitLabel: string;
  unitPrice: number;
  lineTotal: number;
};

export function buildBillLine(medicine: Medicine, input?: MedicinePrintInput): BillLine {
  if (medicineUsesStrip(medicine)) {
    const perStrip =
      input?.mode === "tablets" && input.tabletsPerStrip
        ? input.tabletsPerStrip
        : resolveTabletsPerStrip(medicine);
    const tabletQuantity =
      input?.mode === "tablets" ? Math.max(1, Math.floor(input.tabletQuantity)) : perStrip;
    const stripCount = Math.max(1, Math.ceil(tabletQuantity / perStrip));
    const dose =
      input?.mode === "tablets" && input.doseTablets !== undefined
        ? input.doseTablets
        : resolveDoseTablets(medicine);
    return {
      medicineName: medicine.name,
      genericName: medicine.genericName,
      strength: medicine.strength,
      stripCount,
      tabletsPerStrip: perStrip,
      totalTablets: tabletQuantity,
      doseTablets: dose,
      unitQty: tabletQuantity,
      unitLabel: "tablet",
      unitPrice: 0,
      lineTotal: 0,
    };
  }
  const unitQty = input?.mode === "unit" ? input.unitQty : 1;
  const qty = Math.max(1, unitQty);
  return {
    medicineName: medicine.name,
    genericName: medicine.genericName,
    strength: medicine.strength,
    stripCount: 0,
    tabletsPerStrip: 0,
    totalTablets: qty,
    doseTablets: 0,
    unitQty: qty,
    unitLabel: medicine.unit.toLowerCase(),
    unitPrice: 0,
    lineTotal: 0,
  };
}

export function formatBillTotal(line: BillLine) {
  return formatPkr(line.lineTotal);
}

export type BillCartRow = {
  id: string;
  medicine: Medicine;
  line: BillLine;
};

export function normalizeSupplyDays(days: number) {
  return Math.max(1, Math.floor(Number(days) || 1));
}

export function printFeeForDays(supplyDays: number) {
  return normalizeSupplyDays(supplyDays) * PRINT_FEE_PER_DAY_PKR;
}

export function billGrandTotal(rows: BillCartRow[], supplyDays = 1) {
  if (rows.length === 0) return 0;
  return printFeeForDays(supplyDays);
}
