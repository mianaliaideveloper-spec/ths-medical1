"use client";

import { useState } from "react";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { formatPkr } from "@/lib/format";

export default function RentPage() {
  const { rentItems, saveRentItem, deleteRentItem } = useStore();
  const [name, setName] = useState("");
  const [rentPrice, setRentPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("unit");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(id: string) {
    const item = rentItems.find((entry) => entry.id === id);
    if (!item) return;
    setEditingId(id);
    setName(item.name);
    setRentPrice(item.rentPrice);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setNote(item.note);
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setRentPrice(0);
    setQuantity(1);
    setUnit("unit");
    setNote("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await saveRentItem(
        { name, rentPrice, quantity, unit, note },
        editingId || undefined,
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Remove this rent item?")) return;
    setError("");
    try {
      await deleteRentItem(id);
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Rent desk"
        description="Rentable items and stock counts for the desk."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ths-dark">{editingId ? "Edit rent item" : "New rent item"}</h2>
          <form className="mt-4 space-y-3" onSubmit={(e) => void onSubmit(e)}>
            <Field label="Name">
              <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Rent price (PKR per unit)">
              <input
                className={fieldClass}
                type="number"
                min={0}
                step={1}
                value={rentPrice}
                onChange={(e) => setRentPrice(Number(e.target.value) || 0)}
                required
              />
            </Field>
            <Field label="Quantity in stock">
              <input
                className={fieldClass}
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
                required
              />
            </Field>
            <Field label="Unit (piece, day, …)">
              <input className={fieldClass} value={unit} onChange={(e) => setUnit(e.target.value)} required />
            </Field>
            <Field label="Note (optional)">
              <input className={fieldClass} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {error && <Notice>{error}</Notice>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Saving…" : editingId ? "Update" : "Add"}
              </button>
              {editingId && (
                <button type="button" className="rounded-lg border border-line px-4 py-2.5 text-sm" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ths-dark">Rent list</h2>
          {rentItems.length === 0 ? (
            <EmptyState title="No rent items" body="Add wheelchair, oxygen cylinder, or other rent items on the left." />
          ) : (
            <ul className="mt-4 divide-y divide-line text-sm">
              {rentItems.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium text-ths-dark">{item.name}</p>
                    <p className="text-xs text-muted">
                      Stock {item.quantity} {item.unit} · {formatPkr(item.rentPrice)} / {item.unit}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="text-clinic text-xs font-semibold" onClick={() => startEdit(item.id)}>
                      Edit
                    </button>
                    <button type="button" className="text-danger text-xs font-semibold" onClick={() => void onDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
