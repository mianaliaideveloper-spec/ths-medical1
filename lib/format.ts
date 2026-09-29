export const LOW_STOCK_DAYS = 90;
/** In-stock items with quantity below this count are treated as low stock. */
export const LOW_STOCK_THRESHOLD = 10;

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(expiryDate: string) {
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const today = new Date(`${todayIso()}T00:00:00`);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

export function isExpired(medicine: { expiryDate: string }) {
  return daysUntil(medicine.expiryDate) < 0;
}

export function isExpiringSoon(medicine: { expiryDate: string }) {
  const days = daysUntil(medicine.expiryDate);
  return days >= 0 && days <= LOW_STOCK_DAYS;
}

export function isLowStock(medicine: { quantity: number }) {
  return medicine.quantity > 0 && medicine.quantity < LOW_STOCK_THRESHOLD;
}

export function isOutOfStock(medicine: { quantity: number }) {
  return medicine.quantity <= 0;
}

export function stockStatus(medicine: {
  quantity: number;
  expiryDate: string;
}) {
  if (isExpired(medicine)) return "expired" as const;
  if (isOutOfStock(medicine)) return "out" as const;
  if (isLowStock(medicine)) return "low" as const;
  if (isExpiringSoon(medicine)) return "expiring" as const;
  return "ok" as const;
}

export function formatPkr(value: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
