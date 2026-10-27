import { STORE_LABEL } from "@/lib/branding";
import { medicineNameCatalog, type MedicineNameCatalogEntry } from "@/lib/medicine-name-catalog";
import { prepareMedicineForSave } from "@/lib/medicine-save";
import { formatStrength, parseStrength } from "@/lib/strength";
import type { Category, Medicine, MedicineInput, Supplier } from "@/lib/types";
import { THS_SHEET_SOURCE_VERSION } from "@/lib/ths-medicine-sheet-data";

export const THS_SHEET_SUPPLIER_NAME = "THS Medical Center";

/** Fallback when a medicine has no matching balance in the shared workbook. */
export const THS_SHEET_DEFAULT_QUANTITY = 0;

const catalogNameKeys = new Set(
  medicineNameCatalog.map((item) => normalizeMedicineName(item.name)),
);

function normalizeMedicineName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isThsCatalogMedicineName(name: string) {
  return catalogNameKeys.has(normalizeMedicineName(name));
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
  return {
    name: entry.name,
    genericName: entry.genericName,
    categoryId: category.id,
    categoryName: category.name,
    manufacturer: STORE_LABEL,
    strength: entry.strength || formatStrength(strength.value, strength.unit),
    strengthValue: strength.value,
    strengthUnit: strength.unit,
    manufacturingDate: "",
    batchNumber: "",
    purchasePrice: 0,
    salePrice: 0,
    quantity: Math.max(0, Math.floor(entry.currentQuantity ?? THS_SHEET_DEFAULT_QUANTITY)),
    reorderLevel: entry.minimumStock ?? 10,
    expiryDate: entry.expiryDate || "",
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
  const have = new Set(existingMedicines.map((item) => normalizeMedicineName(item.name)));
  const categoryByType = new Map(categories.map((item) => [item.name, item]));
  const now = new Date().toISOString();
  const rows: Medicine[] = [];

  for (const entry of medicineNameCatalog) {
    const key = normalizeMedicineName(entry.name);
    if (have.has(key)) continue;
    have.add(key);
    const category = categoryByType.get(entry.itemType);
    if (!category) continue;
    const input = catalogEntryToMedicineInput(entry, category, supplier);
    const payload = prepareMedicineForSave(input);
    const row: Medicine = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    if (entry.currentQuantity !== null) {
      row.sheetStockImportedAt = now;
      row.sheetStockImportVersion = THS_SHEET_SOURCE_VERSION;
    }
    rows.push(row);
  }
  return rows;
}

export type ThsSheetMedicineUpdate = Pick<Medicine, "id" | "expiryDate" | "reorderLevel">
  & Partial<Pick<Medicine, "quantity" | "sheetStockImportedAt" | "sheetStockImportVersion">>;

/** Import a workbook balance once per source version; preserve later live stock. */
export function buildThsSheetMedicineUpdates(existingMedicines: Medicine[]): ThsSheetMedicineUpdate[] {
  const sourceByName = new Map(medicineNameCatalog.map((entry) => [normalizeMedicineName(entry.name), entry]));
  const updates: ThsSheetMedicineUpdate[] = [];
  const now = new Date().toISOString();

  for (const existing of existingMedicines) {
    const source = sourceByName.get(normalizeMedicineName(existing.name));
    if (!source) continue;
    const expiryDate = source.expiryDate || existing.expiryDate;
    const reorderLevel = source.minimumStock ?? existing.reorderLevel;
    const canImportSheetQuantity = source.currentQuantity !== null
      && existing.sheetStockImportVersion !== THS_SHEET_SOURCE_VERSION;
    const quantity = canImportSheetQuantity
      ? source.currentQuantity ?? existing.quantity
      : existing.quantity;
    const sheetStockImportedAt = canImportSheetQuantity ? now : existing.sheetStockImportedAt;
    const sheetStockImportVersion = canImportSheetQuantity
      ? THS_SHEET_SOURCE_VERSION
      : existing.sheetStockImportVersion;
    if (
      existing.expiryDate === expiryDate
      && existing.reorderLevel === reorderLevel
      && existing.quantity === quantity
      && existing.sheetStockImportedAt === sheetStockImportedAt
      && existing.sheetStockImportVersion === sheetStockImportVersion
    ) continue;
    const update: ThsSheetMedicineUpdate = { id: existing.id, expiryDate, reorderLevel };
    if (quantity !== existing.quantity) update.quantity = quantity;
    if (sheetStockImportedAt !== undefined && sheetStockImportedAt !== existing.sheetStockImportedAt) {
      update.sheetStockImportedAt = sheetStockImportedAt;
    }
    if (sheetStockImportVersion !== undefined && sheetStockImportVersion !== existing.sheetStockImportVersion) {
      update.sheetStockImportVersion = sheetStockImportVersion;
    }
    updates.push(update);
  }

  return updates;
}

export function thsSheetCatalogSize() {
  return medicineNameCatalog.length;
}
