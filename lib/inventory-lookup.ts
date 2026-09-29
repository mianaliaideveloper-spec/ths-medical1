import type { Medicine } from "@/lib/types";

export function findMedicineInInventory(
  medicines: Medicine[],
  medicineId: string,
  query: string,
): Medicine | undefined {
  if (medicineId) {
    const byId = medicines.find((item) => item.id === medicineId);
    if (byId) return byId;
  }
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;
  return medicines.find((item) => item.name.trim().toLowerCase() === needle);
}
