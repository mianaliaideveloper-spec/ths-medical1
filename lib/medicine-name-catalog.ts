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

/** THS clinic spreadsheet (98 items) + legacy hints kept for older names. */
export const medicineNameCatalog: MedicineNameCatalogEntry[] = (() => {
  const byName = new Map<string, MedicineNameCatalogEntry>();
  for (const row of THS_SHEET_MEDICINES) {
    byName.set(row.name.trim().toLowerCase(), buildCatalogEntry(row.name.trim(), row.itemType));
  }
  const legacy: Array<[string, string]> = [
    ["Augmentin", "Tablet"],
    ["Risek", "Tablet"],
    ["Norvasc", "Tablet"],
    ["Lipiget", "Tablet"],
    ["Amaryl", "Tablet"],
    ["Ventolin Inhaler", "Inhaler"],
    ["Hydryllin Syrup", "Syrup"],
    ["Calcee", "Tablet"],
    ["Surbex-Z", "Tablet"],
    ["Zyrtec", "Tablet"],
  ];
  for (const [name, itemType] of legacy) {
    const key = name.toLowerCase();
    if (!byName.has(key)) byName.set(key, buildCatalogEntry(name, itemType));
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
})();
