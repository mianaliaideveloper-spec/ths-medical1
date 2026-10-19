import { STORE_LABEL } from "@/lib/branding";
import { daysUntil, todayIso } from "@/lib/format";
import { medicineNameCatalog, type MedicineNameCatalogEntry } from "@/lib/medicine-name-catalog";
import { prepareMedicineForSave } from "@/lib/medicine-save";
import { formatStrength, parseStrength } from "@/lib/strength";
import type { Category, Medicine, MedicineInput, Supplier } from "@/lib/types";

export const THS_SHEET_SUPPLIER_NAME = "THS Medical Center";

/** Default qty for clinic list items (≥10 = in stock, not low/out). */
export const THS_SHEET_DEFAULT_QUANTITY = 10;

const catalogNameKeys = new Set(
  medicineNameCatalog.map((item) => item.name.trim().toLowerCase()),
);

export function isThsCatalogMedicineName(name: string) {
  return catalogNameKeys.has(name.trim().toLowerCase());
}

export function thsSheetDefaultDates() {
  const today = todayIso();
  const expiry = new Date(`${today}T00:00:00`);
  expiry.setFullYear(expiry.getFullYear() + 2);
  return {
    manufacturingDate: today,
    expiryDate: expiry.toISOString().slice(0, 10),
  };
}

export function applyThsInStockDefaults(medicine: Medicine): Medicine {
  const dates = thsSheetDefaultDates();
  const now = new Date().toISOString();
  const expiryOk = medicine.expiryDate && daysUntil(medicine.expiryDate) >= 0;
  return {
    ...medicine,
    quantity: medicine.quantity > 0 ? medicine.quantity : THS_SHEET_DEFAULT_QUANTITY,
    manufacturingDate: medicine.manufacturingDate?.trim() || dates.manufacturingDate,
    expiryDate: expiryOk ? medicine.expiryDate : dates.expiryDate,
    updatedAt: now,
  };
}

export function restockThsCatalogMedicines(medicines: Medicine[]) {
  let count = 0;
  const updated = medicines.map((item) => {
    if (!isThsCatalogMedicineName(item.name)) return item;
    if (item.quantity > 0 && item.expiryDate && daysUntil(item.expiryDate) >= 0) return item;
    count += 1;
    return applyThsInStockDefaults(item);
  });
  return { medicines: updated, count };
}

function thsSheetPlaceholderFields() {
  const dates = thsSheetDefaultDates();
  return {
    manufacturingDate: dates.manufacturingDate,
    expiryDate: dates.expiryDate,
    purchasePrice: 0,
    salePrice: 0,
    quantity: THS_SHEET_DEFAULT_QUANTITY,
    reorderLevel: 10,
  };
}

function defaultStrength(entry: MedicineNameCatalogEntry) {
  const parsed = parseStrength(entry.strength);
  if (parsed.value > 0) return parsed;
  switch (entry.itemType) {
    case "Syrup":
    case "Lotion":
      return { value: 120, unit: "ml" };
    case "Injection":
      return { value: 1, unit: "ml" };
    case "Ointment":
    case "Cream":
    case "Gel":
    case "Balm":
      return { value: 1, unit: "%" };
    case "Medical Item":
      return { value: 1, unit: "mg" };
    case "Drops":
      return { value: 10, unit: "ml" };
    case "Pkt":
      return { value: 1, unit: "mg" };
    case "Tape":
      return { value: 1, unit: "mg" };
    default:
      return { value: 1, unit: "mg" };
  }
}

export function catalogEntryToMedicineInput(
  entry: MedicineNameCatalogEntry,
  category: Pick<Category, "id" | "name">,
  supplier: Pick<Supplier, "id" | "name">,
): MedicineInput {
  const strength = defaultStrength(entry);
  const unit = entry.unit || "Tablet";
  const placeholder = thsSheetPlaceholderFields();
  return {
    name: entry.name,
    genericName: entry.genericName,
    categoryId: category.id,
    categoryName: category.name,
    manufacturer: STORE_LABEL,
    strength: entry.strength || formatStrength(strength.value, strength.unit),
    strengthValue: strength.value,
    strengthUnit: strength.unit,
    manufacturingDate: placeholder.manufacturingDate,
    batchNumber: "",
    purchasePrice: placeholder.purchasePrice,
    salePrice: placeholder.salePrice,
    quantity: placeholder.quantity,
    reorderLevel: placeholder.reorderLevel,
    expiryDate: placeholder.expiryDate,
    supplierId: supplier.id,
    supplierName: supplier.name,
    unit,
    tabletsPerStrip: unit === "Tablet" || unit === "Capsule" ? 10 : 1,
    doseTablets: 0,
    shelf: "",
    storeLabel: STORE_LABEL,
  };
}

export function ensureThsSheetCategories(existing: Category[]): Category[] {
  const types = [...new Set(medicineNameCatalog.map((item) => item.itemType))].sort();
  const byName = new Map(existing.map((item) => [item.name, item]));
  const next = [...existing];
  for (const name of types) {
    if (byName.has(name)) continue;
    const category: Category = {
      id: crypto.randomUUID(),
      name,
      description: `THS clinic list · ${name}`,
    };
    next.push(category);
    byName.set(name, category);
  }
  return next.sort((a, b) => a.name.localeCompare(b.name));
}

export function ensureThsSheetSupplier(existing: Supplier[]): Supplier {
  const found = existing.find((item) => item.name === THS_SHEET_SUPPLIER_NAME);
  if (found) return found;
  return {
    id: crypto.randomUUID(),
    name: THS_SHEET_SUPPLIER_NAME,
    contactPerson: "Pharmacy desk",
    phone: "",
    email: "",
    address: "",
    city: "",
  };
}

export function buildThsSheetMedicineRows(
  existingMedicines: Medicine[],
  categories: Category[],
  supplier: Supplier,
): Medicine[] {
  const have = new Set(existingMedicines.map((item) => item.name.trim().toLowerCase()));
  const categoryByType = new Map(categories.map((item) => [item.name, item]));
  const now = new Date().toISOString();
  const rows: Medicine[] = [];

  for (const entry of medicineNameCatalog) {
    const key = entry.name.trim().toLowerCase();
    if (have.has(key)) continue;
    have.add(key);
    const category = categoryByType.get(entry.itemType);
    if (!category) continue;
    const input = catalogEntryToMedicineInput(entry, category, supplier);
    const payload = prepareMedicineForSave(input);
    rows.push({
      ...payload,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }
  return rows;
}

export function thsSheetCatalogSize() {
  return medicineNameCatalog.length;
}
