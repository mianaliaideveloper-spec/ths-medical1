"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { formatDate, formatDateTime, formatPkr, isExpired, isLowStock, isOutOfStock, stockQuantity } from "@/lib/format";
import type { Supplier } from "@/lib/types";

type SupplierForm = Omit<Supplier, "id" | "supplierCode">;
const blank: SupplierForm = { name: "", companyName: "", contactPerson: "", phone: "", whatsappNumber: "", email: "", address: "", city: "" };

export default function SuppliersPage() {
  const { suppliers, medicines, movements, saveSupplier, deleteSupplier } = useStore();
  const [form, setForm] = useState<SupplierForm>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return suppliers;
    return suppliers.filter((supplier) => `${supplier.name} ${supplier.companyName || ""} ${supplier.phone} ${supplier.whatsappNumber || ""} ${supplier.email}`.toLowerCase().includes(needle));
  }, [search, suppliers]);

  function stats(supplierId: string) {
    const purchases = movements.filter((item) => item.type === "in" && item.supplierId === supplierId && item.purchaseAmount !== undefined);
    const payments = movements.filter((item) => item.type === "supplier_payment" && item.supplierId === supplierId);
    const purchased = purchases.reduce((sum, item) => sum + (Number(item.purchaseAmount) || 0), 0);
    const paid = payments.reduce((sum, item) => sum + (Number(item.paymentAmount) || 0), 0);
    return { purchases, payments, purchased, paid, due: Math.max(0, purchased - paid) };
  }

  function set(key: keyof SupplierForm, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      await saveSupplier({
        name: form.name.trim(), companyName: form.companyName?.trim() || "", contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(), whatsappNumber: form.whatsappNumber?.trim() || "", email: form.email.trim(),
        address: form.address.trim(), city: form.city.trim(),
      }, editing || undefined);
      setSuccess(editing ? "Supplier details updated in Firestore." : "Supplier saved in Firestore.");
      setForm(blank); setEditing(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save supplier details."); }
    finally { setBusy(false); }
  }

  function editSupplier(item: Supplier) {
    setEditing(item.id);
    setForm({ name: item.name, companyName: item.companyName || "", contactPerson: item.contactPerson || "", phone: item.phone || "", whatsappNumber: item.whatsappNumber || "", email: item.email || "", address: item.address || "", city: item.city || "" });
    setError(""); setSuccess("");
  }

  async function removeSupplier(item: Supplier) {
    if (!window.confirm(`Delete supplier ${item.name}? Supplier purchase history is kept and prevents deletion.`)) return;
    setError(""); setSuccess("");
    try { await deleteSupplier(item.id); setSuccess("Supplier deleted."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete supplier."); }
  }

  return (
    <div>
      <PageHeader title="Supplier Management" description="Manage supplier contacts, supplied medicines, invoice history, payments and outstanding balances." action={<Link href="/stock-in" className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white">Record Stock In</Link>} />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {success && <Card className="mb-4 border border-clinic/20 bg-clinic-soft/50 p-4 text-sm font-medium text-ths-dark">{success}</Card>}
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="p-5">
          <h2 className="font-semibold text-ths-dark">{editing ? "Edit supplier" : "Add new supplier"}</h2>
          <form onSubmit={(event) => void onSubmit(event)} className="mt-4 space-y-3">
            <Field label="Supplier name"><input className={fieldClass} value={form.name} onChange={(event) => set("name", event.target.value)} required /></Field>
            <Field label="Company name"><input className={fieldClass} value={form.companyName || ""} onChange={(event) => set("companyName", event.target.value)} /></Field>
            <Field label="Contact person (optional)"><input className={fieldClass} value={form.contactPerson} onChange={(event) => set("contactPerson", event.target.value)} /></Field>
            <Field label="Mobile number"><input className={fieldClass} type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} required /></Field>
            <Field label="WhatsApp number (optional)"><input className={fieldClass} type="tel" value={form.whatsappNumber || ""} onChange={(event) => set("whatsappNumber", event.target.value)} /></Field>
            <Field label="Email (optional)"><input className={fieldClass} type="email" value={form.email} onChange={(event) => set("email", event.target.value)} /></Field>
            <Field label="Address"><textarea className={fieldClass + " min-h-20"} value={form.address} onChange={(event) => set("address", event.target.value)} /></Field>
            <Field label="City / area"><input className={fieldClass} value={form.city} onChange={(event) => set("city", event.target.value)} /></Field>
            <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className="rounded-lg bg-clinic px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : editing ? "Save changes" : "Add supplier"}</button>{editing && <button type="button" className="rounded-lg border border-line px-4 py-2.5 text-sm" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}</div>
          </form>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-xs text-muted">Total suppliers</p><p className="mt-1 text-2xl font-semibold">{suppliers.length}</p></Card><Card className="p-4"><p className="text-xs text-muted">All supplier purchases</p><p className="mt-1 text-2xl font-semibold">{formatPkr(suppliers.reduce((sum, item) => sum + stats(item.id).purchased, 0))}</p></Card><Card className="p-4"><p className="text-xs text-muted">Outstanding payments</p><p className="mt-1 text-2xl font-semibold text-warning">{formatPkr(suppliers.reduce((sum, item) => sum + stats(item.id).due, 0))}</p></Card></div>
          <Card className="overflow-hidden">
            <div className="border-b border-line p-4"><input className={fieldClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by supplier, company, mobile or WhatsApp" aria-label="Search suppliers" /></div>
            {filtered.length === 0 ? <EmptyState title="No suppliers found" body={suppliers.length ? "Try another search." : "Add the suppliers you purchase medicines from."} /> : <div className="divide-y divide-line">
              {filtered.map((supplier) => {
                const ledger = stats(supplier.id);
                const linked = medicines.filter((medicine) => medicine.supplierId === supplier.id);
                const expandedRow = expanded === supplier.id;
                return <article key={supplier.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="font-semibold text-ths-dark">{supplier.name}{supplier.companyName ? <span className="font-normal text-muted"> · {supplier.companyName}</span> : null}</h3><p className="mt-1 text-xs text-muted">Supplier ID: {supplier.supplierCode || `SUP-${supplier.id.slice(-6).toUpperCase()}`} · {supplier.contactPerson || "No contact person"}</p><p className="mt-1 text-sm">Mobile {supplier.phone}{supplier.whatsappNumber ? ` · WhatsApp ${supplier.whatsappNumber}` : ""}</p><p className="text-sm text-muted">{supplier.email || "No email"}{supplier.address ? ` · ${supplier.address}` : ""}{supplier.city ? ` · ${supplier.city}` : ""}</p></div>
                    <div className="flex flex-wrap gap-2 text-sm"><button type="button" className="text-clinic" onClick={() => setExpanded(expandedRow ? null : supplier.id)}>{expandedRow ? "Hide history" : "History & medicines"}</button><button type="button" className="text-clinic" onClick={() => editSupplier(supplier)}>Edit</button><button type="button" className="text-danger" onClick={() => void removeSupplier(supplier)}>Delete</button></div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4"><div className="rounded-lg bg-ths-soft/40 p-3"><p className="text-xs text-muted">Supplied medicines</p><p className="font-semibold">{linked.length}</p></div><div className="rounded-lg bg-ths-soft/40 p-3"><p className="text-xs text-muted">Purchase total</p><p className="font-semibold">{formatPkr(ledger.purchased)}</p></div><div className="rounded-lg bg-ths-soft/40 p-3"><p className="text-xs text-muted">Paid</p><p className="font-semibold">{formatPkr(ledger.paid)}</p></div><div className="rounded-lg bg-amber-50 p-3"><p className="text-xs text-warning">Outstanding</p><p className="font-semibold text-warning">{formatPkr(ledger.due)}</p></div></div>
                  {expandedRow && <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <section><h4 className="font-semibold text-ths-dark">Supplied medicines</h4>{linked.length ? <ul className="mt-2 space-y-2">{linked.map((medicine) => <li key={medicine.id} className="flex justify-between gap-3 rounded-lg border border-line p-3 text-sm"><span>{medicine.name}<span className="block text-xs text-muted">Batch {medicine.batchNumber || "—"} · exp {formatDate(medicine.expiryDate)}</span></span><span className={isExpired(medicine) ? "text-danger" : isOutOfStock(medicine) || isLowStock(medicine) ? "text-warning" : "text-ths-dark"}>{stockQuantity(medicine)} {medicine.unit}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted">No medicine linked yet. Add one in Stock In.</p>}</section>
                    <section><h4 className="font-semibold text-ths-dark">Purchase and payment history</h4>{ledger.purchases.length || ledger.payments.length ? <div className="mt-2 max-h-80 space-y-2 overflow-auto">{ledger.purchases.map((item) => <div key={item.id} className="rounded-lg border border-line p-3 text-sm"><p className="font-medium">Purchase · {item.invoiceNumber || "No invoice"} · {item.medicineName}</p><p className="mt-1 text-xs text-muted">{formatDate(item.purchaseDate || item.createdAt)} · batch {item.batchNumber || "—"} · qty {item.quantity} · {formatPkr(Number(item.purchaseAmount) || 0)}</p></div>)}{ledger.payments.map((item) => <div key={item.id} className="rounded-lg border border-clinic/20 bg-clinic-soft/30 p-3 text-sm"><p className="font-medium">Payment · {item.invoiceNumber || "No invoice"} · {formatPkr(Number(item.paymentAmount) || 0)}</p><p className="mt-1 text-xs text-muted">{formatDateTime(item.createdAt)} · {item.note}</p></div>)}</div> : <p className="mt-2 text-sm text-muted">No purchases or payments recorded.</p>}</section>
                  </div>}
                  {linked.some((medicine) => !isExpired(medicine) && (isLowStock(medicine) || isOutOfStock(medicine))) && <p className="mt-3 text-xs text-warning">This supplier has medicines that need restocking.</p>}
                </article>;
              })}
            </div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
