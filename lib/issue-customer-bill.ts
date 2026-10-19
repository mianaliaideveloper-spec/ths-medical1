import type { BillCartRow } from "@/lib/bill";
import type { DeskData } from "@/lib/desk";
import type { BillIssueSummary, Medicine, RentItem } from "@/lib/types";

function aggregateMedicineIssues(rows: BillCartRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.kind !== "medicine") continue;
    map.set(row.medicine.id, (map.get(row.medicine.id) ?? 0) + row.issueQty);
  }
  return map;
}

function aggregateRentIssues(rows: BillCartRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.kind !== "rent") continue;
    map.set(row.item.id, (map.get(row.item.id) ?? 0) + row.issueQty);
  }
  return map;
}

export function validateBillAgainstStock(
  rows: BillCartRow[],
  medicines: Medicine[],
  rentItems: RentItem[],
) {
  if (rows.length === 0) throw new Error("Add at least one item to the bill.");
  for (const [id, need] of aggregateMedicineIssues(rows)) {
    const med = medicines.find((item) => item.id === id);
    if (!med) throw new Error("A medicine on the bill is no longer in inventory.");
    if (need > med.quantity) {
      throw new Error(`${med.name}: need ${need} ${med.unit}, only ${med.quantity} in stock.`);
    }
  }
  for (const [id, need] of aggregateRentIssues(rows)) {
    const rent = rentItems.find((item) => item.id === id);
    if (!rent) throw new Error("A rent item on the bill was removed.");
    if (need > rent.quantity) {
      throw new Error(`${rent.name}: need ${need} ${rent.unit}, only ${rent.quantity} available.`);
    }
  }
}

export function applyCustomerBillStockLocal(
  data: DeskData,
  rows: BillCartRow[],
  createdBy: string,
  note: string,
): { data: DeskData; summary: BillIssueSummary[] } {
  validateBillAgainstStock(rows, data.medicines, data.rentItems ?? []);
  const medIssues = aggregateMedicineIssues(rows);
  const rentIssues = aggregateRentIssues(rows);
  const now = new Date().toISOString();
  const summary: BillIssueSummary[] = [];
  const nextMovements = [...data.movements];

  let medicines = data.medicines;
  for (const [id, qty] of medIssues) {
    const medicine = medicines.find((item) => item.id === id)!;
    const next = medicine.quantity - qty;
    medicines = medicines.map((item) =>
      item.id === id ? { ...item, quantity: next, updatedAt: now } : item,
    );
    nextMovements.unshift({
      id: crypto.randomUUID(),
      medicineId: id,
      medicineName: medicine.name,
      type: "out",
      quantity: qty,
      balanceAfter: next,
      note,
      createdAt: now,
      createdBy,
    });
    summary.push({
      kind: "medicine",
      name: medicine.name,
      issued: qty,
      unit: medicine.unit,
      balanceAfter: next,
    });
  }

  let rentItems = data.rentItems ?? [];
  for (const [id, qty] of rentIssues) {
    const item = rentItems.find((entry) => entry.id === id)!;
    const next = item.quantity - qty;
    rentItems = rentItems.map((entry) =>
      entry.id === id ? { ...entry, quantity: next, updatedAt: now } : entry,
    );
    nextMovements.unshift({
      id: crypto.randomUUID(),
      medicineId: "",
      medicineName: item.name,
      type: "out",
      quantity: qty,
      balanceAfter: next,
      note,
      createdAt: now,
      createdBy,
      rentItemId: id,
    });
    summary.push({
      kind: "rent",
      name: item.name,
      issued: qty,
      unit: item.unit,
      balanceAfter: next,
    });
  }

  return {
    data: {
      ...data,
      medicines,
      rentItems,
      movements: nextMovements,
    },
    summary,
  };
}
