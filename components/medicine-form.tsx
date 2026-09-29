"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GenericNameAutocomplete, MedicineNameAutocomplete } from "@/components/medicine-autocomplete";
import { Field, Notice, fieldClass } from "./shell";
import { useStore } from "./store";
import { STORE_LABEL } from "@/lib/branding";
import { prepareMedicineForSave } from "@/lib/medicine-save";
import { parseStrength, STRENGTH_UNITS } from "@/lib/strength";
import type { Medicine, MedicineInput } from "@/lib/types";

function formFromMedicine(medicine: Medicine): MedicineInput {
  return {
    name: medicine.name,
    genericName: medicine.genericName,
    categoryId: medicine.categoryId,
    categoryName: medicine.categoryName,
    manufacturer: medicine.manufacturer,
    strength: medicine.strength,
    strengthValue: medicine.strengthValue,
    strengthUnit: medicine.strengthUnit,
    manufacturingDate: medicine.manufacturingDate || "",
    batchNumber: medicine.batchNumber,
    purchasePrice: medicine.purchasePrice,
    salePrice: medicine.salePrice,
    quantity: medicine.quantity,
    reorderLevel: medicine.reorderLevel,
    expiryDate: medicine.expiryDate,
    supplierId: medicine.supplierId,
    supplierName: medicine.supplierName,
    unit: medicine.unit,
    tabletsPerStrip: medicine.tabletsPerStrip || 10,
    doseTablets: medicine.doseTablets ?? 0,
    shelf: medicine.shelf,
    storeLabel: medicine.storeLabel || STORE_LABEL,
  };
}

const empty: MedicineInput = {
  name: "",
  genericName: "",
  categoryId: "",
  categoryName: "",
  manufacturer: "",
  strength: "",
  strengthValue: 0,
  strengthUnit: "mg",
  manufacturingDate: "",
  batchNumber: "",
  purchasePrice: 0,
  salePrice: 0,
  quantity: 0,
  reorderLevel: 20,
  expiryDate: "",
  supplierId: "",
  supplierName: "",
  unit: "Tablet",
  tabletsPerStrip: 10,
  doseTablets: 0,
  shelf: "",
  storeLabel: STORE_LABEL,
};

export function MedicineForm({ medicine, initialName = "" }: { medicine?: Medicine; initialName?: string }) {
  const router = useRouter();
  const { medicines, suppliers, saveMedicine } = useStore();
  const [form, setForm] = useState<MedicineInput>(() => {
    if (medicine) return formFromMedicine(medicine);
    if (initialName.trim()) return { ...empty, name: initialName.trim() };
    return empty;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof MedicineInput>(key: K, value: MedicineInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.genericName.trim()) {
      setError("Medicine name and generic name are required.");
      return;
    }
    if (!form.strengthValue || form.strengthValue <= 0) {
      setError("Enter strength (e.g. 500 mg).");
      return;
    }
    if (!form.supplierId || !form.expiryDate || !form.manufacturingDate) {
      setError("Choose supplier, manufacturing date, and expiry date.");
      return;
    }
    if (form.salePrice < form.purchasePrice) {
      setError("Sale price cannot be lower than purchase price.");
      return;
    }
    const supplier = suppliers.find((item) => item.id === form.supplierId);
    setSaving(true);
    try {
      const payload = prepareMedicineForSave(
        {
          ...form,
          name: form.name.trim(),
          genericName: form.genericName.trim(),
          categoryId: form.categoryId || "",
          categoryName: form.categoryName || "",
          supplierName: supplier?.name || form.supplierName,
          purchasePrice: Number(form.purchasePrice),
          salePrice: Number(form.salePrice),
          quantity: Number(form.quantity),
          tabletsPerStrip: Number(form.tabletsPerStrip) || 10,
          strengthValue: Number(form.strengthValue),
          unit: form.unit || "Tablet",
        },
        medicine,
      );
      await saveMedicine(payload, medicine?.id);
      router.push(medicine ? `/medicines/${medicine.id}` : "/medicines");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the medicine.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm md:grid-cols-2">
      <MedicineNameAutocomplete
        label="Medicine name"
        medicines={medicines}
        value={form.name}
        onChange={(name) => set("name", name)}
        required
        onSelectMedicine={(item) => {
          const full = medicines.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
          const parsed = parseStrength(item.strength);
          setForm((current) => ({
            ...current,
            name: item.name,
            genericName: item.genericName,
            strengthValue: full?.strengthValue || parsed.value || current.strengthValue,
            strengthUnit: full?.strengthUnit || parsed.unit || current.strengthUnit,
            unit: full?.unit || item.unit || current.unit,
            tabletsPerStrip: full && full.tabletsPerStrip > 0 ? full.tabletsPerStrip : current.tabletsPerStrip,
          }));
        }}
      />
      <GenericNameAutocomplete
        label="Generic name"
        medicines={medicines}
        value={form.genericName}
        onChange={(genericName) => set("genericName", genericName)}
        required
      />
      <Field label="Strength">
        <div className="flex gap-2">
          <input
            className={`${fieldClass} min-w-0 flex-1`}
            type="number"
            min={0}
            step="any"
            value={form.strengthValue || ""}
            onChange={(e) => set("strengthValue", Number(e.target.value) || 0)}
            placeholder="500"
            required
          />
          <select
            className={`${fieldClass} w-28 shrink-0`}
            value={form.strengthUnit}
            onChange={(e) => set("strengthUnit", e.target.value)}
          >
            {STRENGTH_UNITS.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
      </Field>
      <Field label="Supplier">
        <select className={fieldClass} value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)} required>
          <option value="">Select supplier</option>
          {suppliers.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        {suppliers.length === 0 && (
          <p className="mt-1 text-xs text-muted">
            <Link href="/suppliers" className="text-clinic font-medium hover:underline">
              Add a supplier
            </Link>{" "}
            before saving medicine.
          </p>
        )}
      </Field>
      <Field label="Manufacturing date">
        <input className={fieldClass} type="date" value={form.manufacturingDate} onChange={(e) => set("manufacturingDate", e.target.value)} required />
      </Field>
      <Field label="Tablets per strip">
        <input
          className={fieldClass}
          type="number"
          min={1}
          value={form.tabletsPerStrip}
          onChange={(e) => set("tabletsPerStrip", Number(e.target.value) || 1)}
          required
        />
      </Field>
      <Field label="Purchase price (PKR)">
        <input className={fieldClass} type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => set("purchasePrice", Number(e.target.value))} required />
      </Field>
      <Field label="Sale price (PKR)">
        <input className={fieldClass} type="number" min="0" step="0.01" value={form.salePrice} onChange={(e) => set("salePrice", Number(e.target.value))} required />
      </Field>
      <Field label="Quantity">
        <input className={fieldClass} type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", Number(e.target.value))} required />
      </Field>
      <Field label="Expiry date">
        <input className={fieldClass} type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} required />
      </Field>
      {error && <div className="md:col-span-2"><Notice>{error}</Notice></div>}
      <div className="flex gap-3 md:col-span-2">
        <button
          disabled={saving}
          className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
            medicine ? "bg-clinic hover:bg-clinic-dark" : "bg-ths hover:bg-ths-dark"
          }`}
        >
          {saving ? "Saving…" : medicine ? "Save changes" : "Add medicine"}
        </button>
        <button type="button" className="rounded-lg border border-line px-4 py-2.5 text-sm" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
