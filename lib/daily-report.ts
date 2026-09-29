import { formatDate, formatDateTime, todayIso } from "@/lib/format";
import type { Medicine, StockMovement } from "@/lib/types";

export type DailyReportRow = {
  time: string;
  medicine: string;
  type: string;
  quantity: number;
  note: string;
  by: string;
};

export function movementsForDay(movements: StockMovement[], day = todayIso()) {
  return movements
    .filter((item) => item.createdAt.slice(0, 10) === day)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function buildDailyReportRows(movements: StockMovement[], day = todayIso()): DailyReportRow[] {
  return movementsForDay(movements, day).map((item) => ({
    time: formatDateTime(item.createdAt),
    medicine: item.medicineName,
    type: item.type,
    quantity: item.quantity,
    note: item.note,
    by: item.createdBy,
  }));
}

export function dailyReportSummary(movements: StockMovement[], day = todayIso()) {
  const rows = movementsForDay(movements, day);
  return {
    date: formatDate(day),
    totalMovements: rows.length,
    stockIn: rows.filter((item) => item.type === "in").reduce((sum, item) => sum + item.quantity, 0),
    stockOut: rows.filter((item) => item.type === "out").reduce((sum, item) => sum + item.quantity, 0),
    adjustments: rows.filter((item) => item.type === "adjustment").length,
  };
}

export function dailyReportMedicinesTouched(movements: StockMovement[], medicines: Medicine[], day = todayIso()) {
  const ids = new Set(movementsForDay(movements, day).map((item) => item.medicineId));
  return medicines.filter((item) => ids.has(item.id));
}
