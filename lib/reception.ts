import { todayIso } from "@/lib/format";
import type { ReceptionVisit } from "@/lib/types";

/** Reception doctor slip has no charge. */
export const RECEPTION_SLIP_FEE_PKR = 0;

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

export function cnicDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCnic(value: string) {
  const digits = cnicDigits(value);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

export function isValidCnic(value: string) {
  return cnicDigits(value).length === 13;
}

export type ReceptionFormInput = {
  patientName: string;
  cnic: string;
  age: number;
  complaint: string;
  phone?: string;
};

export function validateReceptionInput(input: ReceptionFormInput) {
  if (!input.patientName.trim()) {
    throw new Error("Patient name is required.");
  }
  if (input.cnic.trim() && !isValidCnic(input.cnic)) {
    throw new Error("Enter all 13 CNIC digits (e.g. 35202-1234567-1).");
  }
  if (input.complaint.trim() && input.complaint.trim().length < 3) {
    throw new Error("Enter at least 3 characters for symptoms / complaint.");
  }
  const age = Math.floor(Number(input.age));
  if (!age || age <= 0 || age > 120) {
    throw new Error("Enter a valid age (1–120).");
  }
  return {
    patientName: input.patientName.trim(),
    cnic: formatCnic(input.cnic),
    age,
    complaint: input.complaint.trim(),
    phone: input.phone?.trim() || "",
  };
}
