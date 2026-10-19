"use client";

import { useState } from "react";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { MedicineNameAutocomplete } from "@/components/medicine-autocomplete";
import { isExpired } from "@/lib/format";
import type { PrescribedMedicine } from "@/lib/types";

export default function DoctorPage() {
  const { receptionVisits, medicines, saveReceptionPrescription } = useStore();
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<PrescribedMedicine[]>([]);
  const [medicineQuery, setMedicineQuery] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const waiting = receptionVisits.filter((visit) => visit.status === "waiting_doctor");
  const selected = waiting.find((visit) => visit.id === selectedId);
  const allergyComplaint = Boolean(selected && /allerg(y|ies)|الرجی/i.test(selected.complaint));
  const inStockMedicines = medicines.filter((item) => item.quantity > 0 && !isExpired(item));

  function addMedicine(medicineId: string) {
    const med = medicines.find((item) => item.id === medicineId);
    if (!med) return;
    if (items.some((item) => item.medicineId === medicineId)) return;
    setItems((current) => [...current, { medicineId: med.id, medicineName: med.name, quantity: 1, dosage: "", instructions: "" }]);
    setMedicineQuery("");
  }

  async function sendToReception() {
    if (!selected || items.length === 0) { setError("Select at least one medicine before sending."); return; }
    if (items.some((item) => item.quantity < 1 || !item.dosage.trim())) { setError("Enter a quantity and dosage for every medicine."); return; }
    setError("");
    try {
      await saveReceptionPrescription(selected.id, items, note);
      setSaved(true); setSelectedId(""); setItems([]); setNote("");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send prescription."); }
  }

  return <div>
    <PageHeader title="Doctor" description="Review patients from reception, prescribe medicines, and send the visit back to reception." />
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="p-5"><h2 className="font-semibold text-ths-dark">Waiting patients ({waiting.length})</h2>
        {waiting.length ? <div className="mt-3 space-y-2">{waiting.map((visit) => <button key={visit.id} onClick={() => { setSelectedId(visit.id); setItems([]); setNote(""); setSaved(false); }} className={`w-full rounded-xl border p-3 text-left ${selectedId === visit.id ? "border-clinic bg-clinic-soft" : "border-line"}`}><span className="font-semibold">#{visit.tokenNumber} · {visit.patientName}</span><span className="mt-1 block text-xs text-muted">{visit.slipNumber} · {visit.age} years</span>{visit.complaint && <span className="mt-2 block text-sm">{visit.complaint}</span>}</button>)}</div> : <EmptyState title="No patients waiting" body="New reception registrations will appear here." />}
      </Card>
      <Card className="p-5">{selected ? <><h2 className="text-lg font-semibold text-ths-dark">Prescription · {selected.patientName}</h2><p className="mt-1 text-sm text-muted">{selected.slipNumber} · {selected.age} years</p>{selected.complaint && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm"><b>Symptoms / allergy details:</b> {selected.complaint}</p>}
        <div className="mt-4 max-w-xl"><MedicineNameAutocomplete label="Select medicine" placeholder="Type a name, e.g. P…" medicines={medicines} value={medicineQuery} onChange={setMedicineQuery} onSelectMedicine={(item) => { if (item.medicineId) addMedicine(item.medicineId); }} /></div>
        {allergyComplaint && <section className="mt-4 rounded-xl border border-clinic/20 bg-clinic-soft/50 p-3"><h3 className="font-semibold text-ths-dark">In-stock medicines for selection ({inStockMedicines.length})</h3><p className="mt-1 text-xs text-muted">The reception note mentions allergy. Choose from available, unexpired stock as clinically appropriate.</p><div className="mt-3 max-h-64 space-y-1 overflow-auto">{inStockMedicines.map((med) => <button key={med.id} type="button" disabled={items.some((item) => item.medicineId === med.id)} onClick={() => addMedicine(med.id)} className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-sm hover:bg-ths-soft disabled:opacity-50"><span>{med.name} <span className="text-xs text-muted">{med.strength}</span></span><span className="ml-3 shrink-0 text-xs text-muted">{items.some((item) => item.medicineId === med.id) ? "Added" : `Stock ${med.quantity} · Add`}</span></button>)}</div></section>}
        <div className="mt-3 space-y-3">{items.map((item, index) => <div key={`${item.medicineId}-${index}`} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_100px_1fr_1fr_auto]"><div className="py-2 text-sm font-medium">{item.medicineName}</div><input className={fieldClass} aria-label="Quantity" type="number" min="1" value={item.quantity} onChange={(e) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, quantity: Number(e.target.value) } : row))}/><input className={fieldClass} placeholder="Dose e.g. 1 tablet" value={item.dosage} onChange={(e) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, dosage: e.target.value } : row))}/><input className={fieldClass} placeholder="Instructions" value={item.instructions} onChange={(e) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, instructions: e.target.value } : row))}/><button type="button" className="text-danger" onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))}>Remove</button></div>)}</div>
        <Field label="Doctor notes"><textarea className={`${fieldClass} mt-1 min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        {error && <div className="mt-3"><Notice>{error}</Notice></div>}{saved && <p className="mt-3 text-sm font-medium text-ths-dark">Prescription sent to reception.</p>}
        <button type="button" onClick={sendToReception} className="mt-4 rounded-lg bg-ths px-5 py-2.5 text-sm font-semibold text-white">Save & send to reception</button>
      </> : <EmptyState title="Choose a patient" body="Select a waiting patient to review their details and prescribe medicines." />}</Card>
    </div>
  </div>;
}
