import { formatPkr } from "@/lib/format";
import { medicineUsesStrip, resolveDoseTablets, resolveTabletsPerStrip } from "@/lib/pack";
import type { Medicine, RentItem } from "@/lib/types";

export type MedicineIssueInput =
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

export function buildBillLine(medicine: Medicine, input?: MedicineIssueInput): BillLine {
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
    const unitPrice = Math.max(0, medicine.salePrice);
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
      unitPrice,
      lineTotal: stripCount * unitPrice,
    };
  }
  const unitQty = input?.mode === "unit" ? input.unitQty : 1;
  const qty = Math.max(1, unitQty);
  const unitPrice = Math.max(0, medicine.salePrice);
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
    unitPrice,
    lineTotal: qty * unitPrice,
  };
}

export function formatBillTotal(line: BillLine) {
  return formatPkr(line.lineTotal);
}

export type MedicineBillRow = {
  id: string;
  kind: "medicine";
  medicine: Medicine;
  line: BillLine;
  /** Units removed from inventory (strips or product unit). */
  issueQty: number;
};

export type RentBillRow = {
  id: string;
  kind: "rent";
  item: RentItem;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  issueQty: number;
};

export type BillCartRow = MedicineBillRow | RentBillRow;

/** Inventory deduction for one medicine line (strips for strip packs, else unit qty). */
export function billLineIssueQuantity(medicine: Medicine, line: BillLine) {
  if (medicineUsesStrip(medicine)) return line.stripCount;
  return line.unitQty;
}

export function medicineIssueInCart(rows: BillCartRow[], medicineId: string) {
  return rows.reduce((sum, row) => {
    if (row.kind !== "medicine" || row.medicine.id !== medicineId) return sum;
    return sum + row.issueQty;
  }, 0);
}

export function rentIssueInCart(rows: BillCartRow[], rentItemId: string) {
  return rows.reduce((sum, row) => {
    if (row.kind !== "rent" || row.item.id !== rentItemId) return sum;
    return sum + row.issueQty;
  }, 0);
}

export function buildRentBillRow(item: RentItem, qty: number): RentBillRow {
  const issueQty = Math.max(1, Math.floor(qty));
  const unitPrice = Math.max(0, item.rentPrice);
  return {
    id: crypto.randomUUID(),
    kind: "rent",
    item,
    qty: issueQty,
    unitPrice,
    lineTotal: issueQty * unitPrice,
    issueQty,
  };
}

export function billGrandTotal(rows: BillCartRow[]) {
  return rows.reduce((sum, row) => {
    if (row.kind === "medicine") return sum + row.line.lineTotal;
    return sum + row.lineTotal;
  }, 0);
}

export function stockPreview(currentQty: number, issueQty: number) {
  const issue = Math.max(0, Math.floor(issueQty));
  return {
    before: currentQty,
    issue,
    after: currentQty - issue,
  };
}
