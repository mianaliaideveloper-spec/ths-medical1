"use client";

import { formatDate, formatPkr } from "@/lib/format";
import { STORE_LABEL, STORE_LEGAL_NAME } from "@/lib/branding";
import { billGrandTotal, type BillCartRow } from "@/lib/bill";
import { PRINT_FEE_PER_DAY_PKR } from "@/lib/branding";
import { normalizeSupplyDays } from "@/lib/bill";

export function BillPreview({
  rows,
  supplyDays,
  onRemove,
}: {
  rows: BillCartRow[];
  supplyDays: number;
  onRemove?: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ths-soft/25 p-6 text-center text-sm text-muted">
        <p className="font-medium text-ths-dark">No items yet</p>
        <p className="mt-1">Add medicines on the right.</p>
      </div>
    );
  }

  const days = normalizeSupplyDays(supplyDays);
  const grand = billGrandTotal(rows, days);

  return (
    <div className="rounded-xl border border-line bg-gradient-to-b from-white to-ths-soft/20 p-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-ths">{STORE_LABEL}</p>
        <p className="text-sm font-semibold text-ths-dark">{STORE_LEGAL_NAME}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex justify-between gap-2 border-b border-dashed border-line/80 pb-2 last:border-0">
            <div className="min-w-0">
              <p className="font-medium text-ths-dark">{row.line.medicineName}</p>
              <p className="text-xs text-muted">
                {row.line.totalTablets} {row.line.unitLabel}
                {row.line.stripCount > 0 ? ` · ${row.line.stripCount} strip(s)` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium text-muted">Free</p>
              {onRemove && (
                <button type="button" className="text-xs text-danger" onClick={() => onRemove(row.id)}>
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm text-ths-dark">
        <div className="flex justify-between">
          <span className="text-muted">Fee per day</span>
          <span>{formatPkr(PRINT_FEE_PER_DAY_PKR)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Days of supply</span>
          <span>{days}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Dispensing fee (print)</span>
          <span>{formatPkr(grand)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatPkr(grand)}</span>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted">Medicine is free · fee prints on slip</p>
    </div>
  );
}
