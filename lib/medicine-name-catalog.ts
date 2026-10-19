import { THS_SHEET_MEDICINES } from "@/lib/ths-medicine-sheet-data";

/** Name hints for autocomplete — not loaded into inventory until you add stock. */
export type MedicineNameCatalogEntry = {
  name: string;
  genericName: string;
  strength: string;
  itemType: string;
  unit: string;
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

function buildCatalogEntry(name: string, itemType: string): MedicineNameCatalogEntry {
  const strength = strengthLabelFromName(name);
  return {
    name,
    genericName: name,
    strength,
    itemType,
    unit: unitFromItemType(itemType),
  };
}

/** THS clinic final list only — see lib/ths-medicine-sheet-data.ts */
export const medicineNameCatalog: MedicineNameCatalogEntry[] = THS_SHEET_MEDICINES.map((row) =>
  buildCatalogEntry(row.name.trim(), row.itemType),
).sort((a, b) => a.name.localeCompare(b.name));
