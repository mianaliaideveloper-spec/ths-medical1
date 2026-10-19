"use client";

import Link from "next/link";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/shell";
import { useStore } from "@/components/store";
import {
  daysUntil,
  formatDate,
  isExpired,
  isExpiringSoon,
  isLowStock,
  isOutOfStock,
  LOW_STOCK_THRESHOLD,
} from "@/lib/format";

export default function AlertsPage() {
  const { medicines } = useStore();
  const low = medicines.filter((item) => !isExpired(item) && (isLowStock(item) || isOutOfStock(item)));
  const expiry = medicines.filter((item) => isExpired(item) || (isExpiringSoon(item) && item.quantity > 0));

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Use Low Stock Report and Expiry Report from the main menu. This page shows both together."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold text-ths-dark">Low stock</h2>
            <p className="text-sm text-muted">
              {low.length} medicines with less than {LOW_STOCK_THRESHOLD} units (or out of stock).
            </p>
          </div>
          {low.length === 0 ? (
            <EmptyState
              title="Stock levels are healthy"
              body={`Every in-date item has at least ${LOW_STOCK_THRESHOLD} units.`}
            />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Qty</th>
                    <th>Supplier</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {low.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link className="font-medium text-clinic" href={`/medicines/${item.id}`}>
                          {item.name}
                        </Link>
                        <div className="text-xs text-muted">{item.genericName}</div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{item.supplierName || "—"}</td>
                      <td><StatusBadge status={item.quantity <= 0 ? "out" : "low"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold text-ths-dark">Expiry</h2>
            <p className="text-sm text-muted">Expired batches and those due within 90 days.</p>
          </div>
          {expiry.length === 0 ? <EmptyState title="No expiry alerts" body="No in-stock medicine expires in the next 90 days." /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Medicine</th><th>Strength</th><th>Expiry</th><th>Days</th></tr></thead>
                <tbody>
                  {expiry.map((item) => (
                    <tr key={item.id}>
                      <td><Link className="text-clinic" href={`/medicines/${item.id}`}>{item.name}</Link></td>
                      <td>{item.strength}</td>
                      <td>{formatDate(item.expiryDate)}</td>
                      <td>{daysUntil(item.expiryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
