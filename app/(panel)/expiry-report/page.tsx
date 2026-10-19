"use client";

import Link from "next/link";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/shell";
import { useStore } from "@/components/store";
import { daysUntil, formatDate, isExpired, isExpiringSoon } from "@/lib/format";

export default function ExpiryReportPage() {
  const { medicines } = useStore();
  const rows = medicines
    .filter((item) => item.quantity > 0 && (isExpired(item) || isExpiringSoon(item)))
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  return (
    <div>
      <PageHeader
        title="Expiry Report"
        description="Expired or expiring within 90 days (with stock on hand)."
        action={
          <Link href="/medicines" className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold">
            Medicine Master
          </Link>
        }
      />
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No expiry alerts" body="No in-stock medicine is expired or due within 90 days." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                  <th>Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatDate(item.expiryDate)}</td>
                    <td>{daysUntil(item.expiryDate)}</td>
                    <td>
                      <StatusBadge status={isExpired(item) ? "expired" : "expiring"} />
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
