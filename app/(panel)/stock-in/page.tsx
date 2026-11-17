"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { formatDate, formatDateTime, formatPkr, stockQuantity, todayIso } from "@/lib/format";
import type { StockMovement } from "@/lib/types";

function invoiceKey(supplierId: string, invoice: string) {
  return `${supplierId}::${invoice.trim().toLowerCase()}`;
}

export default function StockInPage() {
  const { medicines, suppliers, movements, recordStockPurchase, recordSupplierPayment } = useStore();
  const [supplierId, setSupplierId] = useState("");
  const [medicineId, setMedicineId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentInvoice, setPaymentInvoice] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedMedicine = medicines.find((item) => item.id === medicineId);
  const lineTotal = quantity * (Number(purchasePrice) || 0);
  const stockInEntries = useMemo(() => movements
    .filter((item) => item.type === "in" && item.purchaseAmount !== undefined)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [movements]);
  const invoiceAccounts = useMemo(() => {
    const groups = new Map<string, { supplierId: string; supplierName: string; invoiceNumber: string; total: number; paid: number; latestDate: string }>();
    for (const item of stockInEntries) {
      if (!item.supplierId || !item.invoiceNumber) continue;
      const key = invoiceKey(item.supplierId, item.invoiceNumber);
      const group = groups.get(key) ?? { supplierId: item.supplierId, supplierName: item.supplierName || "Supplier", invoiceNumber: item.invoiceNumber, total: 0, paid: 0, latestDate: item.purchaseDate || item.createdAt };
      group.total += Number(item.purchaseAmount) || 0;
      groups.set(key, group);
    }
    for (const item of movements.filter((row) => row.type === "supplier_payment")) {
      if (!item.supplierId || !item.invoiceNumber) continue;
      const group = groups.get(invoiceKey(item.supplierId, item.invoiceNumber));
      if (group) group.paid += Number(item.paymentAmount) || 0;
    }
    return [...groups.entries()].map(([key, group]) => ({ ...group, key, due: Math.max(0, group.total - group.paid) }))
      .filter((group) => group.due > 0)
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [movements, stockInEntries]);
  const selectedInvoice = invoiceAccounts.find((item) => item.key === paymentInvoice);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      await recordStockPurchase({
        supplierId, invoiceNumber, purchaseDate,
        line: { medicineId, batchNumber, quantity, purchasePrice: Number(purchasePrice), salePrice: Number(salePrice), expiryDate },
        amountPaid: amountPaid === "" ? 0 : Number(amountPaid),
      });
      setSuccess(`${selectedMedicine?.name || "Medicine"} saved to Firestore stock and purchase history.`);
      setMedicineId(""); setBatchNumber(""); setQuantity(1); setPurchasePrice(""); setSalePrice(""); setExpiryDate(""); setAmountPaid("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this purchase."); }
    finally { setBusy(false); }
  }

  async function addPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      if (!selectedInvoice) throw new Error("Select an outstanding invoice.");
      await recordSupplierPayment({ supplierId: selectedInvoice.supplierId, invoiceNumber: selectedInvoice.invoiceNumber, amount: Number(paymentAmount), note: paymentNote });
      setSuccess(`Payment of ${formatPkr(Number(paymentAmount))} saved to supplier payment history.`);
      setPaymentAmount(""); setPaymentNote("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save supplier payment."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Stock In / Purchase" description="Record a supplier invoice, update medicine batches and stock, and track paid or outstanding amounts." />
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      {success && <Card className="mb-4 border border-clinic/20 bg-clinic-soft/50 p-4 text-sm font-medium text-ths-dark">{success}</Card>}
      {suppliers.length === 0 && <Card className="mb-4 p-4 text-sm">Add a supplier before recording a purchase. <Link className="font-semibold text-clinic" href="/suppliers">Open Supplier Management</Link></Card>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-5">
          <h2 className="font-semibold text-ths-dark">New supplier invoice line</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
            <Field label="Supplier"><select className={fieldClass} value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required><option value="">Select supplier…</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.companyName ? ` · ${item.companyName}` : ""}</option>)}</select></Field>
            <Field label="Invoice number"><input className={fieldClass} value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} required /></Field>
            <Field label="Purchase date"><input className={fieldClass} type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} required /></Field>
            <Field label="Medicine"><select className={fieldClass} value={medicineId} onChange={(event) => { const id = event.target.value; const item = medicines.find((medicine) => medicine.id === id); setMedicineId(id); setPurchasePrice(item ? String(item.purchasePrice || "") : ""); setSalePrice(item ? String(item.salePrice || "") : ""); }} required><option value="">Select medicine…</option>{medicines.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.strength} · stock {stockQuantity(item)}</option>)}</select></Field>
            <Field label="Batch number"><input className={fieldClass} value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} required /></Field>
            <Field label="Quantity purchased"><input className={fieldClass} type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} required /></Field>
            <Field label="Expiry date"><input className={fieldClass} type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} required /></Field>
            <Field label="Purchase price / unit"><input className={fieldClass} type="number" min="0" step="0.01" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} required /></Field>
            <Field label="Selling price / unit"><input className={fieldClass} type="number" min="0" step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} required /></Field>
            <Field label="Invoice amount paid now"><input className={fieldClass} type="number" min="0" max={lineTotal} step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} placeholder="0 if unpaid" /></Field>
            <div className="rounded-lg bg-ths-soft/50 p-3 text-sm"><span className="text-muted">Line total</span><p className="font-semibold text-ths-dark">{formatPkr(lineTotal)}</p><p className="mt-1 text-xs text-muted">For several medicines on one invoice, use the same invoice number. Enter the payment once; set the other lines to zero paid.</p></div>
            {selectedMedicine && batchNumber && selectedMedicine.batchNumber.trim().toLowerCase() !== batchNumber.trim().toLowerCase() && <p className="sm:col-span-2 rounded-lg bg-amber-50 p-3 text-sm text-warning">This is a different batch. It will be added as a separate inventory lot so the old batch and expiry stay correct.</p>}
            <button type="submit" disabled={busy || suppliers.length === 0 || medicines.length === 0} className="sm:col-span-2 rounded-lg bg-ths px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Saving purchase…" : "Save invoice & add stock"}</button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-ths-dark">Record supplier payment</h2>
          <p className="mt-1 text-xs text-muted">Every payment is saved as a dated ledger entry in Firestore.</p>
          {invoiceAccounts.length === 0 ? <p className="mt-4 text-sm text-muted">No outstanding supplier invoices.</p> : <form className="mt-4 space-y-3" onSubmit={(event) => void addPayment(event)}>
            <Field label="Outstanding invoice"><select className={fieldClass} value={paymentInvoice} onChange={(event) => setPaymentInvoice(event.target.value)} required><option value="">Select invoice…</option>{invoiceAccounts.map((item) => <option key={item.key} value={item.key}>{item.supplierName} · {item.invoiceNumber} · due {formatPkr(item.due)}</option>)}</select></Field>
            {selectedInvoice && <p className="rounded-lg bg-amber-50 p-3 text-sm">Outstanding balance: <b>{formatPkr(selectedInvoice.due)}</b></p>}
            <Field label="Payment amount"><input className={fieldClass} type="number" min="0.01" max={selectedInvoice?.due} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required /></Field>
            <Field label="Note (optional)"><input className={fieldClass} value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Cash, bank transfer…" /></Field>
            <button type="submit" disabled={busy || !selectedInvoice} className="w-full rounded-lg bg-clinic px-4 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save payment"}</button>
          </form>}
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-line px-5 py-4"><h2 className="font-semibold text-ths-dark">Purchase history</h2><p className="text-sm text-muted">Supplier invoice lines with batch, stock and payment status.</p></div>
        {stockInEntries.length === 0 ? <EmptyState title="No supplier purchases recorded" body="Saved stock-in entries will appear here." /> : <div className="table-wrap"><table className="data"><thead><tr><th>Date / invoice</th><th>Supplier</th><th>Medicine / batch</th><th>Qty</th><th>Purchase total</th><th>Paid / due</th><th>Status</th></tr></thead><tbody>
          {stockInEntries.slice(0, 100).map((item: StockMovement) => {
            const sameInvoice = stockInEntries.filter((row) => row.supplierId === item.supplierId && row.invoiceNumber?.toLowerCase() === item.invoiceNumber?.toLowerCase());
            const purchaseTotal = sameInvoice.reduce((sum, row) => sum + (Number(row.purchaseAmount) || 0), 0);
            const paid = movements.filter((row) => row.type === "supplier_payment" && row.supplierId === item.supplierId && row.invoiceNumber?.toLowerCase() === item.invoiceNumber?.toLowerCase()).reduce((sum, row) => sum + (Number(row.paymentAmount) || 0), 0);
            const status = paid >= purchaseTotal ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
            return <tr key={item.id}><td>{formatDate(item.purchaseDate || item.createdAt)}<span className="block text-xs text-muted">{item.invoiceNumber} · recorded {formatDateTime(item.createdAt)}</span></td><td>{item.supplierName || "—"}</td><td>{item.medicineName}<span className="block text-xs text-muted">Batch {item.batchNumber || "—"} · exp {formatDate(item.expiryDate || "")}</span></td><td>{item.quantity}</td><td>{formatPkr(purchaseTotal)}</td><td>{formatPkr(paid)} / {formatPkr(Math.max(0, purchaseTotal - paid))}</td><td>{status}</td></tr>;
          })}
        </tbody></table></div>}
      </Card>
    </div>
  );
}
