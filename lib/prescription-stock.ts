import { isExpired, stockQuantity } from "@/lib/format";
import type { Medicine, PrescribedMedicine, StockMovement } from "@/lib/types";

export type PrescriptionStockNeed = {
  medicineId: string;
  medicineName: string;
  quantity: number;
};

export function aggregatePrescriptionStock(prescription: PrescribedMedicine[]): PrescriptionStockNeed[] {
  if (prescription.length === 0) throw new Error("Add at least one medicine to the prescription.");

  const needs = new Map<string, PrescriptionStockNeed>();
  for (const line of prescription) {
    const quantity = Number(line.quantity);
    if (!line.medicineId) throw new Error("Select a medicine from the inventory list.");
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new Error(`${line.medicineName || "Medicine"}: enter a whole quantity greater than zero.`);
    }
    const current = needs.get(line.medicineId);
    if (current) current.quantity += quantity;
    else needs.set(line.medicineId, { medicineId: line.medicineId, medicineName: line.medicineName, quantity });
  }
  return [...needs.values()];
}

export function validatePrescriptionStock(
  needs: PrescriptionStockNeed[],
  medicines: Medicine[],
) {
  return needs.map((need) => {
    const medicine = medicines.find((item) => item.id === need.medicineId);
    if (!medicine) throw new Error(`${need.medicineName}: medicine is no longer in inventory.`);
    if (isExpired(medicine)) throw new Error(`${medicine.name}: this medicine is expired and cannot be prescribed.`);
    const quantity = Math.floor(stockQuantity(medicine));
    if (need.quantity > quantity) {
      throw new Error(`${medicine.name}: need ${need.quantity} ${medicine.unit}, only ${quantity} in stock.`);
    }
    return { medicine, quantity: need.quantity, balanceAfter: quantity - need.quantity };
  });
}

export function applyPrescriptionStockLocally(
  medicines: Medicine[],
  movements: StockMovement[],
  needs: PrescriptionStockNeed[],
  note: string,
  createdBy: string,
  createdAt: string,
) {
  const validated = validatePrescriptionStock(needs, medicines);
  const nextById = new Map(validated.map(({ medicine, balanceAfter }) => [medicine.id, balanceAfter]));
  const nextMedicines = medicines.map((medicine) => {
    const quantity = nextById.get(medicine.id);
    return quantity === undefined ? medicine : { ...medicine, quantity, updatedAt: createdAt };
  });
  const newMovements: StockMovement[] = validated.map(({ medicine, quantity, balanceAfter }) => ({
    id: crypto.randomUUID(),
    medicineId: medicine.id,
    medicineName: medicine.name,
    type: "out",
    quantity,
    balanceAfter,
    note,
    createdAt,
    createdBy,
  }));
  return { medicines: nextMedicines, movements: [...newMovements, ...movements] };
}
