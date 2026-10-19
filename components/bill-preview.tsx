"use client";

import { STORE_LABEL, STORE_LEGAL_NAME } from "@/lib/branding";
import { billGrandTotal, formatBillTotal, type BillCartRow } from "@/lib/bill";
import { formatPkr } from "@/lib/format";

export function BillPreview({
  rows,
  onRemove,
}: {
  rows: BillCartRow[];
  onRemove?: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ths-soft/25 p-6 text-center text-sm text-muted">
        <p className="font-medium text-ths-dark">No items yet</p>
        <p className="mt-1">Add medicines or rent items on the right.</p>
      </div>
    );
  }

  const grand = billGrandTotal(rows);

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
              {row.kind === "medicine" ? (
                <>
                  <p className="font-medium text-ths-dark">{row.line.medicineName}</p>
                  <p className="text-xs text-muted">
                    Out {row.issueQty} {row.medicine.unit}
                    {row.line.stripCount > 0 ? ` · ${row.line.totalTablets} tab` : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-ths-dark">{row.item.name}</p>
                  <p className="text-xs text-muted">
                    Rent · out {row.issueQty} {row.item.unit}
                  </p>
                </>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-medium text-ths-dark">
                {row.kind === "medicine" ? formatBillTotal(row.line) : formatPkr(row.lineTotal)}
              </p>
              {onRemove && (
                <button type="button" className="text-xs text-danger" onClick={() => onRemove(row.id)}>
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-bold text-ths-dark">
        <span>Total</span>
        <span>{formatPkr(grand)}</span>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted">
        Bill and stock changes are saved when you confirm the issue.
      </p>
    </div>
  );
}
