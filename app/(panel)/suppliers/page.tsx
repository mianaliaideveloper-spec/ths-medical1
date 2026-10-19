"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { isExpired, isLowStock, isOutOfStock, LOW_STOCK_THRESHOLD } from "@/lib/format";
import type { Medicine, Supplier } from "@/lib/types";

function supplierLowStock(supplierId: string, medicines: Medicine[]) {
  return medicines.filter(
    (item) =>
      item.supplierId === supplierId &&
      !isExpired(item) &&
      (isLowStock(item) || isOutOfStock(item)),
  );
}

const blank: Omit<Supplier, "id"> = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  city: "",
};

export default function SuppliersPage() {
  const { suppliers, medicines, saveSupplier, deleteSupplier } = useStore();
  const lowBySupplier = suppliers
    .map((supplier) => ({
      supplier,
      items: supplierLowStock(supplier.id, medicines).sort((a, b) => a.quantity - b.quantity),
    }))
    .filter((row) => row.items.length > 0);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  function set(key: keyof typeof blank, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await saveSupplier({
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
      }, editing || undefined);
      setForm(blank);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the supplier.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description={`Supplier contacts and medicines below ${LOW_STOCK_THRESHOLD} units for each company.`}
      />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="p-5">
          <h2 className="font-semibold text-ths-dark">{editing ? "Edit supplier" : "Add supplier"}</h2>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <Field label="Company"><input className={fieldClass} value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
            <Field label="Contact person"><input className={fieldClass} value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} required /></Field>
            <Field label="Phone"><input className={fieldClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} required /></Field>
            <Field label="Email (optional)"><input className={fieldClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Address (optional)"><input className={fieldClass} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
            <Field label="City"><input className={fieldClass} value={form.city} onChange={(e) => set("city", e.target.value)} required /></Field>
            {error && <Notice>{error}</Notice>}
            <button className="rounded-lg bg-clinic px-4 py-2.5 text-sm font-semibold text-white">Save supplier</button>
          </form>
        </Card>
        <Card>
          {suppliers.length === 0 ? (
            <EmptyState title="No suppliers yet" body="Add a supplier, then link it to medicines when you record stock." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Items</th>
                    <th>Low stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((item) => {
                    const linked = medicines.filter((medicine) => medicine.supplierId === item.id);
                    const lowItems = supplierLowStock(item.id, medicines);
                    return (
                      <tr key={item.id}>
                        <td>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted">{item.email}</p>
                        </td>
                        <td>{item.contactPerson}</td>
                        <td>{item.phone}</td>
                        <td>{item.city}</td>
                        <td>{linked.length}</td>
                        <td>
                          {lowItems.length === 0 ? (
                            <span className="text-xs text-muted">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-warning">
                                {lowItems.length}
                              </span>
                              <span className="text-xs text-muted">&lt; {LOW_STOCK_THRESHOLD}</span>
                            </span>
                          )}
                        </td>
                        <td className="space-x-3 text-sm">
                          <button className="text-clinic" onClick={() => { setEditing(item.id); setForm(item); }}>Edit</button>
                          <button className="text-danger" onClick={async () => {
                            setError("");
                            try { await deleteSupplier(item.id); } catch (err) { setError(err instanceof Error ? err.message : "Could not delete."); }
                          }}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      {lowBySupplier.length > 0 && (
        <Card className="mt-4">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold text-ths-dark">Low stock by supplier</h2>
            <p className="text-sm text-muted">
              In-date medicines with fewer than {LOW_STOCK_THRESHOLD} units — call or order from the supplier listed.
            </p>
          </div>
          <div className="divide-y divide-line">
            {lowBySupplier.map(({ supplier, items }) => (
              <div key={supplier.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ths-dark">{supplier.name}</p>
                  <p className="text-sm text-muted">
                    {supplier.contactPerson} · {supplier.phone}
                  </p>
                </div>
                <ul className="mt-3 space-y-2">
                  {items.map((medicine) => (
                    <li key={medicine.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <Link className="text-clinic" href={`/medicines/${medicine.id}`}>
                        {medicine.name}
                      </Link>
                      <span className={medicine.quantity <= 0 ? "text-danger" : "text-warning"}>
                        {medicine.quantity <= 0 ? "Out of stock" : `${medicine.quantity} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
