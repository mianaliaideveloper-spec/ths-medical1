"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BillPreview } from "@/components/bill-preview";
import { MedicineNameAutocomplete } from "@/components/medicine-autocomplete";
import { Card, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { STORE_LABEL } from "@/lib/branding";
import { buildBillLine, type BillCartRow, type MedicinePrintInput } from "@/lib/bill";
import { findMedicineInInventory } from "@/lib/inventory-lookup";
import { medicineUsesStrip, resolveTabletsPerStrip } from "@/lib/pack";
import { isLocalAdmin, readDeskData } from "@/lib/desk";
import { printCustomerBill } from "@/lib/print";

export default function PrintPage() {
  const { medicines, user, syncLocalInventory } = useStore();
  const [cart, setCart] = useState<BillCartRow[]>([]);
  const [query, setQuery] = useState("");
  const [medicineId, setMedicineId] = useState("");
  const [tabletQuantity, setTabletQuantity] = useState(10);
  const [unitQty, setUnitQty] = useState(1);
  const [supplyDays, setSupplyDays] = useState(1);
  const [billError, setBillError] = useState("");
  const [addedHint, setAddedHint] = useState("");

  useEffect(() => {
    if (!user || !isLocalAdmin(user.uid)) return;
    syncLocalInventory(readDeskData());
  }, [user, syncLocalInventory]);

  const selected = useMemo(
    () => findMedicineInInventory(medicines, medicineId, query),
    [medicineId, medicines, query],
  );

  const selectedId = selected?.id ?? "";

  useEffect(() => {
    if (!selectedId) return;
    const med = medicines.find((item) => item.id === selectedId);
    if (!med) return;
    setTabletQuantity(resolveTabletsPerStrip(med));
    setUnitQty(1);
  }, [selectedId, medicines]);

  const printInput = useMemo((): MedicinePrintInput | undefined => {
    if (!selected) return undefined;
    if (medicineUsesStrip(selected)) {
      return {
        mode: "tablets",
        tabletQuantity,
        tabletsPerStrip: resolveTabletsPerStrip(selected),
        doseTablets: selected.doseTablets ?? 0,
      };
    }
    return { mode: "unit", unitQty };
  }, [selected, tabletQuantity, unitQty]);

  function pickMedicine(id: string) {
    setBillError("");
    setMedicineId(id);
    const med = medicines.find((item) => item.id === id);
    setQuery(med?.name ?? "");
  }

  function addToBill() {
    setBillError("");
    setAddedHint("");
    if (!selected || !printInput) {
      setBillError(
        medicines.length === 0
          ? "No medicines in inventory. Add a medicine first."
          : "Select a medicine from your inventory list (name hints alone are not enough).",
      );
      return;
    }
    setCart((current) => [
      ...current,
      { id: crypto.randomUUID(), medicine: selected, line: buildBillLine(selected, printInput) },
    ]);
    setAddedHint(`${selected.name} added to the bill.`);
    setQuery("");
    setMedicineId("");
  }

  function runPrint() {
    if (cart.length === 0) return;
    printCustomerBill(cart, supplyDays);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Customer bill"
        description={`${STORE_LABEL} · Medicine free · PKR 50 per day on the printed slip.`}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 lg:sticky lg:top-4 lg:self-start">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ths-dark">Bill</h2>
            {cart.length > 0 && (
              <button type="button" className="text-sm text-muted hover:text-danger" onClick={() => setCart([])}>
                Clear
              </button>
            )}
          </div>
          <BillPreview
            rows={cart}
            supplyDays={supplyDays}
            onRemove={(id) => setCart((rows) => rows.filter((row) => row.id !== id))}
          />

          <div className="mt-4 space-y-3 border-t border-line pt-4">
            <Field label="Days of supply (fee = 50 × days)">
              <input
                className={fieldClass}
                type="number"
                min={1}
                value={supplyDays}
                onChange={(e) => setSupplyDays(Number(e.target.value) || 1)}
              />
            </Field>
            <button
              type="button"
              disabled={cart.length === 0}
              className="w-full rounded-lg bg-ths px-4 py-3 text-sm font-semibold text-white hover:bg-ths-dark disabled:opacity-50"
              onClick={runPrint}
            >
              Print bill
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ths-dark">Add medicine</h2>
          <p className="mt-1 text-sm text-muted">Choose from inventory, set quantity, then Add to bill.</p>

          {medicines.length === 0 ? (
            <div className="mt-4 rounded-lg bg-ths-soft/50 px-4 py-3 text-sm">
              <p className="text-ths-dark">Inventory is empty.</p>
              <Link href="/medicines/new" className="mt-2 inline-block font-semibold text-clinic hover:underline">
                Add your first medicine
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <Field label="Medicine in inventory">
                <select
                  className={fieldClass}
                  value={medicineId}
                  onChange={(e) => pickMedicine(e.target.value)}
                >
                  <option value="">Select medicine…</option>
                  {medicines.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · Qty {item.quantity}
                      {item.strength ? ` · ${item.strength}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <MedicineNameAutocomplete
                label="Or search by name"
                medicines={medicines}
                showAddNew
                placeholder="Type name…"
                value={query}
                onChange={(name) => {
                  setQuery(name);
                  setBillError("");
                  const match = findMedicineInInventory(medicines, "", name);
                  setMedicineId(match?.id ?? "");
                }}
                onSelectMedicine={(item) => {
                  setQuery(item.name);
                  setBillError("");
                  if (item.medicineId) {
                    setMedicineId(item.medicineId);
                    return;
                  }
                  const match = findMedicineInInventory(medicines, "", item.name);
                  setMedicineId(match?.id ?? "");
                }}
              />

              {selected ? (
                <p className="rounded-lg bg-clinic-soft/50 px-3 py-2 text-xs text-clinic-dark">
                  {STORE_LABEL} · {selected.strength || "—"} · Exp {selected.expiryDate} · Stock {selected.quantity}
                </p>
              ) : (
                query.trim().length > 0 && (
                  <p className="text-xs text-muted">
                    Not in inventory yet.{" "}
                    <Link href={`/medicines/new?name=${encodeURIComponent(query.trim())}`} className="text-clinic font-medium">
                      Add medicine
                    </Link>
                  </p>
                )
              )}

              {selected && medicineUsesStrip(selected) ? (
                <Field label="Tablet quantity">
                  <input
                    className={fieldClass}
                    type="number"
                    min={1}
                    value={tabletQuantity}
                    onChange={(e) => setTabletQuantity(Math.max(1, Number(e.target.value) || 1))}
                  />
                </Field>
              ) : selected ? (
                <Field label="Quantity">
                  <input
                    className={fieldClass}
                    type="number"
                    min={1}
                    value={unitQty}
                    onChange={(e) => setUnitQty(Math.max(1, Number(e.target.value) || 1))}
                  />
                </Field>
              ) : null}

              {billError && <Notice>{billError}</Notice>}
              {addedHint && (
                <p className="rounded-lg bg-ths-soft px-3 py-2 text-sm text-ths-dark">{addedHint}</p>
              )}

              <button
                type="button"
                disabled={!selected}
                className="w-full rounded-lg bg-ths px-4 py-3 text-sm font-semibold text-white hover:bg-ths-dark disabled:opacity-50"
                onClick={addToBill}
              >
                Add to bill
              </button>
            </div>
          )}
          <p className="mt-4 text-center text-xs text-muted">
            Need full inventory list?{" "}
            <Link href="/reports" className="text-clinic hover:underline">
              Reports
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
