"use client";

import { useState } from "react";
import { Card, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";

export default function StockInPage() {
  const { medicines, adjustStock } = useStore();
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = medicines.find((item) => item.id === medicineId);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!medicineId) {
      setError("Select a medicine.");
      return;
    }
    setBusy(true);
    try {
      await adjustStock(medicineId, "in", quantity, note || "Stock in");
      const med = medicines.find((item) => item.id === medicineId);
      setSuccess(`${med?.name ?? "Medicine"}: +${quantity} ${med?.unit ?? ""} added to stock.`);
      setQuantity(1);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add stock.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Stock In"
        description="Receive new quantity into inventory (same as spreadsheet Stock In)."
      />
      <Card className="p-5">
        {medicines.length === 0 ? (
          <p className="text-sm text-muted">No medicines yet. Sync Sheet1 or open Medicine Master first.</p>
        ) : (
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <Field label="Medicine">
              <select
                className={fieldClass}
                value={medicineId}
                onChange={(e) => setMedicineId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {medicines.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · current {item.quantity} {item.unit}
                  </option>
                ))}
              </select>
            </Field>
            {selected && (
              <p className="rounded-lg bg-ths-soft/50 px-3 py-2 text-xs text-ths-dark">
                After receive: {selected.quantity} + {quantity} = {selected.quantity + Math.max(0, quantity)}{" "}
                {selected.unit}
              </p>
            )}
            <Field label="Quantity received">
              <input
                className={fieldClass}
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                required
              />
            </Field>
            <Field label="Note (optional)">
              <input className={fieldClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier batch, invoice…" />
            </Field>
            {error && <Notice>{error}</Notice>}
            {success && (
              <p className="rounded-lg bg-ths-soft px-3 py-2 text-sm text-ths-dark">{success}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-ths px-4 py-3 text-sm font-semibold text-white hover:bg-ths-dark disabled:opacity-60"
            >
              {busy ? "Saving…" : "Add to stock"}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
