import { isOutOfStock } from "@/lib/format";
import type { Medicine } from "@/lib/types";

/** In-stock and available items first (A–Z); out-of-stock items at the end. */
export function sortMedicinesForDisplay(medicines: Medicine[]) {
  return [...medicines].sort((a, b) => {
    const aOut = isOutOfStock(a);
    const bOut = isOutOfStock(b);
    if (aOut !== bOut) return aOut ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}
