import { THS_SHEET_MEDICINES } from "@/lib/ths-medicine-sheet-data";

/** Medicine names and inventory metadata from the THS workbook. */
export type MedicineNameCatalogEntry = {
  name: string;
  genericName: string;
  strength: string;
  itemType: string;
  unit: string;
  minimumStock: number | null;
  currentQuantity: number | null;
  expiryDate: string;
};

function strengthLabelFromName(name: string): string {
  const combo = name.match(/(\d+(?:\.\d+)?)\s*mg\s*\/\s*\d+\s*ml/i);
  if (combo) return `${combo[1]} mg/ml`;
  const simple = name.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|%|IU)\b/i);
  if (simple) return `${simple[1]} ${simple[2].toLowerCase() === "iu" ? "IU" : simple[2]}`;
  return "";
}

function unitFromItemType(itemType: string): string {
  switch (itemType) {
    case "Tablet":
      return "Tablet";
    case "Capsule":
      return "Capsule";
    case "Syrup":
    case "Lotion":
      return "Bottle";
    case "Injection":
      return "Vial";
    case "Ointment":
    case "Cream":
    case "Gel":
    case "Balm":
      return "Tube";
    case "Medical Item":
      return "Pcs";
    case "Drops":
      return "Bottle";
    case "Pkt":
      return "Pkt";
    case "Tape":
      return "Roll";
    default:
      return itemType || "Tablet";
  }
}

function buildCatalogEntry(row: (typeof THS_SHEET_MEDICINES)[number]): MedicineNameCatalogEntry {
  const name = row.name.trim();
  const itemType = row.itemType;
  const strength = strengthLabelFromName(name);
  return {
    name,
    genericName: name,
    strength,
    itemType,
    unit: unitFromItemType(itemType),
    minimumStock: row.minimumStock,
    currentQuantity: row.currentQuantity,
    expiryDate: row.expiryDate,
  };
}

/** THS clinic final list only — see lib/ths-medicine-sheet-data.ts */
export const medicineNameCatalog: MedicineNameCatalogEntry[] = THS_SHEET_MEDICINES.map((row) =>
  buildCatalogEntry(row),
).sort((a, b) => a.name.localeCompare(b.name));
