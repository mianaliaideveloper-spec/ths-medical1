"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, Field, PageHeader, StatusBadge, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { STORE_LABEL } from "@/lib/branding";
import { daysUntil, formatDate, formatPkr, stockStatus } from "@/lib/format";
import { medicineUsesStrip, resolveTabletsPerStrip } from "@/lib/pack";
import { printMedicine } from "@/lib/print";

export default function MedicineDetailPage() {
  const params = useParams<{ id: string }>();
  const { medicines, movements } = useStore();
  const medicine = medicines.find((item) => item.id === params.id);
  const history = movements.filter((item) => item.medicineId === params.id).slice(0, 8);
  const [supplyDays, setSupplyDays] = useState(1);
  if (!medicine) {
    return <p className="text-sm text-muted">This medicine is not in the inventory.</p>;
  }

  const facts = [
    ["Store label", medicine.storeLabel || STORE_LABEL],
    ["Generic name", medicine.genericName],
    ["Manufacturing date", medicine.manufacturingDate ? formatDate(medicine.manufacturingDate) : "—"],
    ["Purchase price", formatPkr(medicine.purchasePrice)],
    ["Sale price", formatPkr(medicine.salePrice)],
    ["Quantity", `${medicine.quantity} ${medicine.unit}`],
    ...(medicineUsesStrip(medicine)
      ? [
          ["Tablets per strip", String(resolveTabletsPerStrip(medicine))],
        ]
      : []),
    ["Expiry date", `${formatDate(medicine.expiryDate)} (${daysUntil(medicine.expiryDate)} days)`],
    ["Supplier", medicine.supplierName],
  ];

  return (
    <div>
      <PageHeader
        title={medicine.name}
        description={medicine.genericName}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/medicines/${medicine.id}/edit`} className="rounded-lg bg-clinic px-4 py-2.5 text-sm font-semibold text-white">Edit</Link>
            <button
              type="button"
              className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => printMedicine(medicine, undefined, supplyDays)}
            >
              Print slip
            </button>
            <Link href="/print" className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold">Customer bill</Link>
          </div>
        }
      />
      <div className="mb-4"><StatusBadge status={stockStatus(medicine)} /></div>
      <Card className="mb-4 max-w-xs p-4">
        <Field label="Days of supply (print fee = 50 × days)">
          <input
            className={fieldClass}
            type="number"
            min={1}
            value={supplyDays}
            onChange={(e) => setSupplyDays(Number(e.target.value) || 1)}
          />
        </Field>
      </Card>
      <Card className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card className="mt-4 p-5">
        <h2 className="font-semibold text-ths-dark">Recent stock movements</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {history.length === 0 && <li className="py-4 text-muted">No movements recorded yet.</li>}
          {history.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-3">
              <span className="capitalize">{item.type} · {item.quantity} · balance {item.balanceAfter}</span>
              <span className="text-muted">{item.note || item.createdBy}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
