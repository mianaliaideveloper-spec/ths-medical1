import { medicineNameCatalog } from "@/lib/medicine-name-catalog";
import type { Medicine } from "@/lib/types";

export type MedicineSuggestion = {
  name: string;
  genericName: string;
  strength: string;
  unit?: string;
  itemType?: string;
  /** Set when this row exists in live inventory (required for billing). */
  medicineId?: string;
};

function catalog(): MedicineSuggestion[] {
  const seen = new Set<string>();
  const list: MedicineSuggestion[] = [];
  for (const item of medicineNameCatalog) {
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    list.push({
      name: item.name,
      genericName: item.genericName,
      strength: item.strength,
      unit: item.unit,
      itemType: item.itemType,
    });
  }
  return list;
}

export function filterMedicineSuggestions(
  query: string,
  inventory: Medicine[],
  limit = 10,
): MedicineSuggestion[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const merged = new Map<string, MedicineSuggestion>();
  for (const item of inventory) {
    merged.set(item.name.trim().toLowerCase(), {
      name: item.name,
      genericName: item.genericName,
      strength: item.strength,
      medicineId: item.id,
    });
  }
  for (const item of catalog()) {
    const key = item.name.trim().toLowerCase();
    if (!merged.has(key)) merged.set(key, item);
  }

  const inventoryFirst = [...merged.values()].sort((a, b) => {
    if (a.medicineId && !b.medicineId) return -1;
    if (!a.medicineId && b.medicineId) return 1;
    return a.name.localeCompare(b.name);
  });

  return inventoryFirst
    .filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.genericName.toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

export function filterGenericSuggestions(
  query: string,
  inventory: Medicine[],
  limit = 10,
): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const names = new Set<string>();
  for (const item of inventory) names.add(item.genericName);
  for (const item of catalog()) names.add(item.genericName);
  return [...names]
    .filter((name) => name.toLowerCase().includes(needle))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}
