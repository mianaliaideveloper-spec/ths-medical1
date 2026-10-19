"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, PageHeader, StatCard } from "@/components/shell";
import { MedicineNameAutocomplete } from "@/components/medicine-autocomplete";
import { inventorySummary, useStore } from "@/components/store";
import { formatPkr, isExpired, isLowStock, isOutOfStock } from "@/lib/format";

export default function DashboardPage() {
  const router = useRouter();
  const { medicines, suppliers } = useStore();
  const [query, setQuery] = useState("");
  const summary = inventorySummary(medicines);
  const attention = medicines
    .filter((item) => isExpired(item) || isLowStock(item) || isOutOfStock(item))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Type a medicine name to find it quickly."
      />
      <Card className="mb-6 p-4">
        <MedicineNameAutocomplete
          label="Find medicine"
          medicines={medicines}
          value={query}
          onChange={setQuery}
          onSelectMedicine={(item) => router.push(`/medicines?q=${encodeURIComponent(item.name)}`)}
        />
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total medicines" value={summary.total} hint="In inventory" href="/medicines" tone="blue" />
        <StatCard label="Available stock" value={summary.availableUnits} hint={`${summary.availableSkus} items in date`} href="/current-stock" tone="green" />
        <StatCard label="Low-stock medicines" value={summary.low} hint="Less than 10 units or out" href="/low-stock-report" tone="amber" />
        <StatCard label="Expired medicines" value={summary.expired} hint={`${summary.expiring} expiring within 90 days`} href="/expiry-report" tone="red" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-ths-dark">Needs attention</h2>
          <ul className="mt-4 divide-y divide-line">
            {attention.length === 0 && <li className="py-6 text-sm text-muted">No low-stock or expired medicines.</li>}
            {attention.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <Link href={`/medicines/${item.id}`} className="font-medium text-clinic">{item.name}</Link>
                  <p className="text-muted">{item.strength}</p>
                </div>
                <p className="text-right text-muted">{item.quantity} {item.unit.toLowerCase()}s<br />Exp {item.expiryDate}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-ths-dark">Inventory value</h2>
          <p className="mt-4 text-sm text-muted">Purchase value of in-date stock</p>
          <p className="text-2xl font-semibold">{formatPkr(summary.purchaseValue)}</p>
          <p className="mt-4 text-sm text-muted">Sale value of in-date stock</p>
          <p className="text-2xl font-semibold">{formatPkr(summary.saleValue)}</p>
          <p className="mt-4 text-sm text-muted">{suppliers.length} suppliers on file</p>
          <Link href="/reports" className="mt-4 inline-block text-sm font-semibold text-clinic">Open reports</Link>
        </Card>
      </div>
    </div>
  );
}
