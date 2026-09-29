import { PRINT_FEE_PER_DAY_PKR } from "@/lib/branding";
import { todayIso } from "@/lib/format";
import type { ReceptionVisit } from "@/lib/types";

/** One-time reception / referral slip fee (PKR). */
export const RECEPTION_SLIP_FEE_PKR = PRINT_FEE_PER_DAY_PKR;

function visitsOnDay(visits: ReceptionVisit[], day: string) {
  return visits.filter((item) => item.createdAt.slice(0, 10) === day);
}

/** Next daily token (1 for first slip of the day, then 2, 3, …). */
export function nextTokenNumber(visits: ReceptionVisit[], day = todayIso()) {
  return visitsOnDay(visits, day).length + 1;
}

export function nextSlipNumber(visits: ReceptionVisit[], day = todayIso()) {
  const count = nextTokenNumber(visits, day);
  const stamp = day.replace(/-/g, "");
  return `THS-${stamp}-${String(count).padStart(3, "0")}`;
}

function tokenFromSlipNumber(slipNumber: string) {
  const match = slipNumber.match(/-(\d+)$/);
  return match ? Number(match[1]) : 1;
}

/** Older records used `shastiCardNo`; normalize for display and forms. */
export function normalizeReceptionVisit(
  visit: ReceptionVisit & { shastiCardNo?: string; tokenNumber?: number },
): ReceptionVisit {
  const { shastiCardNo, ...rest } = visit;
  const tokenNumber =
    visit.tokenNumber && visit.tokenNumber > 0
      ? visit.tokenNumber
      : tokenFromSlipNumber(visit.slipNumber || "");
  return {
    ...rest,
    cnic: (visit.cnic || shastiCardNo || "").trim(),
    tokenNumber,
  };
}

export function normalizeReceptionVisits(
  visits: (ReceptionVisit & { shastiCardNo?: string })[],
): ReceptionVisit[] {
  return visits.map(normalizeReceptionVisit);
}
