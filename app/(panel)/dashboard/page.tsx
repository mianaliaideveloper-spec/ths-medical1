"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, PageHeader } from "@/components/shell";
import { MedicineNameAutocomplete } from "@/components/medicine-autocomplete";
import { inventorySummary, useStore } from "@/components/store";
import { dateInPakistan, formatDate, formatPkr, isExpired, isExpiringSoon, isLowStock, isOutOfStock, stockQuantity, todayIso } from "@/lib/format";
import type { ReceptionVisit } from "@/lib/types";

function patientKey(visit: ReceptionVisit) {
  return visit.patientNumber?.trim().toLowerCase()
    || visit.patientId?.trim().toLowerCase()
    || visit.phone?.replace(/\D/g, "")
    || visit.patientName.trim().replace(/\s+/g, " ").toLowerCase();
}

function Metric({ label, value, detail, href, tone = "green" }: { label: string; value: string | number; detail: string; href: string; tone?: "green" | "blue" | "amber" | "red" }) {
  const background = tone === "green" ? "bg-ths-soft/60" : tone === "blue" ? "bg-clinic-soft/60" : tone === "amber" ? "bg-amber-50" : "bg-rose-50";
  const valueColor = tone === "red" ? "text-danger" : tone === "amber" ? "text-warning" : "text-ths-dark";
  return <Link href={href} className={`block rounded-2xl border border-line ${background} p-4 transition hover:shadow-sm`}><p className="text-xs font-medium text-muted">{label}</p><p className={`mt-1 text-xl font-semibold ${valueColor}`}>{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></Link>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { medicines, suppliers, receptionVisits, movements, dashboardDataReady } = useStore();
  const [query, setQuery] = useState("");
  const day = todayIso();
  const summary = useMemo(() => inventorySummary(medicines), [medicines]);
  const todayVisits = useMemo(() => receptionVisits.filter((visit) => dateInPakistan(visit.createdAt) === day), [day, receptionVisits]);
  const totalPatients = useMemo(() => new Set(receptionVisits.map(patientKey)).size, [receptionVisits]);
  const firstVisitDay = useMemo(() => {
    const earliest = new Map<string, string>();
    for (const visit of receptionVisits) {
      const key = patientKey(visit);
      const date = dateInPakistan(visit.createdAt);
      const previous = earliest.get(key);
      if (!previous || date < previous) earliest.set(key, date);
    }
    return earliest;
  }, [receptionVisits]);
  const todayUniquePatients = new Set(todayVisits.map(patientKey)).size;
  const todayNewPatientKeys = new Set(todayVisits.filter((visit) => firstVisitDay.get(patientKey(visit)) === day).map(patientKey));
  const todayNewPatients = todayNewPatientKeys.size;
  const todayFollowupPatients = new Set(todayVisits.filter((visit) => (firstVisitDay.get(patientKey(visit)) || day) < day).map(patientKey));
  const todayFollowups = todayFollowupPatients.size;
  const consultationFees = todayVisits.reduce((total, visit) => total + (Number(visit.slipFee) || 0), 0);
  const medicineCollection = movements.filter((item) => item.type === "out" && item.saleAmount && dateInPakistan(item.createdAt) === day).reduce((total, item) => total + (Number(item.saleAmount) || 0), 0);
  const todayCollection = consultationFees + medicineCollection;
  const todayPurchases = movements.filter((item) => item.type === "in" && item.purchaseAmount !== undefined && dateInPakistan(item.purchaseDate || item.createdAt) === day);
  const todayStockInUnits = todayPurchases.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const todayStockInValue = todayPurchases.reduce((sum, item) => sum + (Number(item.purchaseAmount) || 0), 0);
  const totalUnits = medicines.reduce((sum, item) => sum + stockQuantity(item), 0);
  const totalStockValue = medicines.reduce((sum, item) => sum + stockQuantity(item) * (Number(item.purchasePrice) || 0), 0);
  const lowMedicines = medicines.filter((item) => !isExpired(item) && isLowStock(item));
  const outOfStock = medicines.filter((item) => isOutOfStock(item));
  const expired = medicines.filter((item) => stockQuantity(item) > 0 && isExpired(item));
  const nearExpiry = medicines.filter((item) => stockQuantity(item) > 0 && isExpiringSoon(item));
  const attention = [...expired, ...nearExpiry, ...lowMedicines, ...outOfStock].filter((item, index, rows) => rows.findIndex((row) => row.id === item.id) === index).slice(0, 8);
  const display = (value: string | number) => dashboardDataReady ? value : "Loading…";

  return (
    <div>
      <PageHeader title="Medical One Dashboard" description={`Live clinic and inventory summary · ${formatDate(day)}`} />
      <Card className="mb-5 p-4"><MedicineNameAutocomplete label="Find medicine" medicines={medicines} value={query} onChange={setQuery} onSelectMedicine={(item) => router.push(`/medicines?q=${encodeURIComponent(item.name)}`)} /></Card>

      <section aria-label="Patient and collection statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total patients" value={display(totalPatients)} detail="Unique saved patient records" href="/reception" tone="blue" />
        <Metric label="Today's patients" value={display(todayUniquePatients)} detail={`${todayVisits.length} total visit(s) registered today`} href="/reception" />
        <Metric label="Today's new patients" value={display(todayNewPatients)} detail="First recorded visit today" href="/reception" tone="blue" />
        <Metric label="Today's follow-ups" value={display(todayFollowups)} detail="Returning visits today" href="/reception" tone="blue" />
        <Metric label="Today's total collected" value={display(formatPkr(todayCollection))} detail="Consultation fees + customer medicine bills" href="/reports" />
        <Metric label="Consultation fees" value={display(formatPkr(consultationFees))} detail="Saved patient visit fees" href="/reception" />
        <Metric label="Medicine sales / collection" value={display(formatPkr(medicineCollection))} detail="Recorded customer medicine bills" href="/reports" tone="blue" />
        <Metric label="Today's Stock In" value={display(`${todayStockInUnits} units`)} detail={`${formatPkr(todayStockInValue)} purchase value`} href="/stock-in" tone="blue" />
      </section>

      <section aria-label="Inventory statistics" className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Medicines in stock" value={display(totalUnits)} detail={`${medicines.length} medicine / batch records · in-date ${summary.availableUnits} units`} href="/current-stock" />
        <Metric label="Total stock value" value={display(formatPkr(totalStockValue))} detail="Purchase value of recorded stock batches" href="/current-stock" />
        <Metric label="Low stock medicines" value={display(lowMedicines.length)} detail="Below the medicine minimum level" href="/low-stock-report" tone="amber" />
        <Metric label="Out of stock" value={display(outOfStock.length)} detail="No units available" href="/low-stock-report" tone="red" />
        <Metric label="Expired medicines" value={display(expired.length)} detail="Keep these away from usable stock" href="/expiry-report" tone="red" />
        <Metric label="Near expiry" value={display(nearExpiry.length)} detail="Expiring within the next 90 days" href="/expiry-report" tone="amber" />
        <Metric label="Total suppliers" value={display(suppliers.length)} detail="Saved supplier accounts" href="/suppliers" tone="blue" />
        <Metric label="Stock records" value={display(medicines.length)} detail="Each batch is tracked separately" href="/current-stock" tone="blue" />
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-ths-dark">Stock needing attention</h2><p className="mt-1 text-xs text-muted">Low stock, out-of-stock, expiry and near-expiry alerts.</p></div><Link href="/expiry-report" className="text-sm font-semibold text-clinic">Expiry report</Link></div>
          {attention.length === 0 ? <p className="py-6 text-sm text-muted">{dashboardDataReady ? "No stock alerts." : "Loading Firestore inventory…"}</p> : <ul className="mt-3 divide-y divide-line">{attention.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><Link prefetch={false} href={`/medicines/${item.id}`} className="font-medium text-clinic">{item.name}</Link><p className="text-xs text-muted">Batch {item.batchNumber || "—"} · {item.supplierName || "No supplier"}</p></div><p className="text-right text-xs text-muted">{stockQuantity(item)} {item.unit}<br />Expiry {formatDate(item.expiryDate)}{isExpired(item) ? " · EXPIRED" : isExpiringSoon(item) ? " · NEAR EXPIRY" : isOutOfStock(item) ? " · OUT OF STOCK" : isLowStock(item) ? " · LOW STOCK" : ""}</p></li>)}</ul>}
        </Card>
        <Card className="p-5"><h2 className="font-semibold text-ths-dark">Supplier balances</h2><p className="mt-1 text-xs text-muted">Purchase totals, recorded payments and outstanding bills.</p><ul className="mt-3 divide-y divide-line">{suppliers.slice(0, 6).map((supplier) => {
          const purchases = movements.filter((item) => item.type === "in" && item.supplierId === supplier.id && item.purchaseAmount !== undefined).reduce((sum, item) => sum + (Number(item.purchaseAmount) || 0), 0);
          const payments = movements.filter((item) => item.type === "supplier_payment" && item.supplierId === supplier.id).reduce((sum, item) => sum + (Number(item.paymentAmount) || 0), 0);
          return <li key={supplier.id} className="flex justify-between gap-3 py-3 text-sm"><span><Link href="/suppliers" className="font-medium text-clinic">{supplier.name}</Link><span className="block text-xs text-muted">Purchased {formatPkr(purchases)} · paid {formatPkr(payments)}</span></span><span className="text-right font-medium">Due {formatPkr(Math.max(0, purchases - payments))}</span></li>;
        })}{suppliers.length === 0 && <li className="py-5 text-sm text-muted">{dashboardDataReady ? "No suppliers saved." : "Loading Firestore supplier records…"}</li>}</ul><Link href="/suppliers" className="mt-3 inline-block text-sm font-semibold text-clinic">Manage suppliers</Link></Card>
      </div>
    </div>
  );
}
