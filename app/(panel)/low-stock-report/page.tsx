"use client";

import Link from "next/link";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/shell";
import { useStore } from "@/components/store";
import { formatDate, isExpired, isLowStock, isOutOfStock, stockQuantity } from "@/lib/format";

export default function LowStockReportPage() {
  const { medicines } = useStore();
  const low = medicines
    .filter((item) => !isExpired(item) && (isLowStock(item) || isOutOfStock(item)))
    .sort((a, b) => stockQuantity(a) - stockQuantity(b));

  return (
    <div>
      <PageHeader
        title="Low Stock Report"
        description="Items below their set minimum stock or out of stock."
        action={
          <Link href="/stock-in" className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white">
            Stock In
          </Link>
        }
      />
      <Card className="overflow-hidden">
        {low.length === 0 ? (
          <EmptyState title="No low stock" body="All in-date medicines meet their minimum stock level." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Expiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {low.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.name}</td>
                    <td>{stockQuantity(item)}</td>
                    <td>{item.unit}</td>
                    <td>{formatDate(item.expiryDate)}</td>
                    <td>
                      <StatusBadge status={isOutOfStock(item) ? "out" : "low"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
