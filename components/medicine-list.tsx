"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/shell";
import { formatDate, formatPkr, stockStatus } from "@/lib/format";
import type { Medicine } from "@/lib/types";

export function MedicineListTable({
  items,
  onDelete,
  compact = false,
}: {
  items: Medicine[];
  onDelete?: (id: string) => void;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted">No medicines in this list yet.</p>;
  }

  const headings = compact
    ? ["Medicine", "Generic", "Strength", "Qty", "Expiry", ""]
    : ["Medicine", "Generic", "Strength", "Purchase", "Sale", "Qty", "Mfg", "Expiry", "Supplier", ""];

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {headings.map((heading) => (
              <th key={heading}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <p className="font-medium">{item.name}</p>
                {!compact && item.categoryName ? (
                  <p className="text-xs text-muted">{item.categoryName}</p>
                ) : null}
              </td>
              <td>{item.genericName}</td>
              <td>{item.strength}</td>
              {!compact && <td>{formatPkr(item.purchasePrice)}</td>}
              {!compact && <td>{formatPkr(item.salePrice)}</td>}
              <td>{item.quantity}</td>
              {!compact && <td>{item.manufacturingDate ? formatDate(item.manufacturingDate) : "—"}</td>}
              <td>
                <div>{formatDate(item.expiryDate)}</div>
                <StatusBadge status={stockStatus(item)} />
              </td>
              {!compact && <td>{item.supplierName}</td>}
              <td>
                <div className="flex gap-2 whitespace-nowrap text-sm">
                  <Link className="text-clinic" href={`/medicines/${item.id}`}>
                    View
                  </Link>
                  <Link className="text-ths" href={`/medicines/${item.id}/edit`}>
                    Edit
                  </Link>
                  {onDelete && (
                    <button className="text-danger" type="button" onClick={() => onDelete(item.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MedicinesByCategory({
  medicines,
  categoryId,
  categoryName,
  onDelete,
}: {
  medicines: Medicine[];
  categoryId: string;
  categoryName: string;
  onDelete?: (id: string) => void;
}) {
  const items = medicines
    .filter((item) => item.categoryId === categoryId)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="border-b border-line last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <h3 className="font-semibold text-ths-dark">{categoryName}</h3>
          <p className="text-xs text-muted">{items.length} medicines</p>
        </div>
        <Link
          href={`/medicines/new?category=${categoryId}`}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-clinic hover:bg-clinic-soft"
        >
          Add to {categoryName}
        </Link>
      </div>
      <MedicineListTable items={items} onDelete={onDelete} compact />
    </section>
  );
}
