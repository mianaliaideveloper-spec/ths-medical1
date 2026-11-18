"use client";

import { useMemo, useState } from "react";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { formatDateTime } from "@/lib/format";
import { MedicineNameAutocomplete } from "@/components/medicine-autocomplete";
import { isExpired, stockQuantity } from "@/lib/format";
import type { ReceptionVisit } from "@/lib/types";
import type { PrescribedMedicine } from "@/lib/types";

function patientId(visit: ReceptionVisit) {
  return visit.patientNumber || visit.patientId || "—";
}

function visitState(visit: ReceptionVisit) {
  if (visit.status === "medicine_issued") return "Medicines issued";
  if (visit.status === "waiting_reception") return "Ready to issue";
  return "At doctor";
}

export default function MedicineIssuePage() {
  const { receptionVisits, receptionVisitsLoaded, medicines, markReceptionMedicineIssued, registerReceptionVisit, saveReceptionPrescription } = useStore();
  const [query, setQuery] = useState("");
  const [issuingId, setIssuingId] = useState("");
  const [error, setError] = useState("");
  const [reissuingId, setReissuingId] = useState("");
  const [notice, setNotice] = useState("");
  const [editingPrescriptionId, setEditingPrescriptionId] = useState("");
  const [prescriptionItems, setPrescriptionItems] = useState<PrescribedMedicine[]>([]);
  const [medicineQuery, setMedicineQuery] = useState("");
  const [draftMedicineId, setDraftMedicineId] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("");
  const [draftDosage, setDraftDosage] = useState("");
  const [draftInstructions, setDraftInstructions] = useState("");
  const [followUpDays, setFollowUpDays] = useState("");
  const [savingPrescription, setSavingPrescription] = useState(false);
  const availableMedicines = useMemo(() => medicines.filter((medicine) => stockQuantity(medicine) > 0 && !isExpired(medicine)), [medicines]);

  const visits = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const digits = normalized.replace(/\D/g, "");
    if (!normalized) return receptionVisits.filter((visit) => visit.status === "waiting_doctor" || visit.status === "waiting_reception");
    return receptionVisits.filter((visit) => {
      const id = (visit.patientNumber || visit.patientId || "").toLowerCase();
      const phone = (visit.phone || "").replace(/\D/g, "");
      return id.includes(normalized) || visit.patientName.trim().toLowerCase().includes(normalized) || (digits.length >= 4 && phone.includes(digits));
    });
  }, [query, receptionVisits]);

  const latestPatientRecords = useMemo(() => {
    if (!query.trim()) return [];
    const needle = query.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    const matches = receptionVisits.filter((visit) => {
      const id = (visit.patientNumber || visit.patientId || "").toLowerCase();
      const phone = (visit.phone || "").replace(/\D/g, "");
      return id.includes(needle) || visit.patientName.trim().toLowerCase().includes(needle) || (digits.length >= 4 && phone.includes(digits));
    });
    const identity = matches[0]?.patientNumber || matches[0]?.patientId;
    if (!identity) return [];
    return receptionVisits.filter((visit) => (visit.patientNumber || visit.patientId) === identity);
  }, [query, receptionVisits]);

  async function requestReissue(previous: ReceptionVisit) {
    setError("");
    setNotice("");
    setReissuingId(previous.id);
    try {
      const activeVisit = receptionVisits.find((visit) =>
        (visit.patientNumber || visit.patientId) === (previous.patientNumber || previous.patientId)
        && (visit.status === "waiting_doctor" || visit.status === "waiting_reception"),
      );
      if (activeVisit) throw new Error(activeVisit.status === "waiting_doctor"
        ? "This patient already has a visit waiting for the doctor."
        : "This patient already has a prescription waiting to be issued at reception.");
      const visit = await registerReceptionVisit({
        patientNumber: previous.patientNumber || previous.patientId || "",
        patientName: previous.patientName,
        cnic: "",
        age: previous.age,
        complaint: "",
        phone: previous.phone,
      });
      setNotice(`Return visit ${visit.slipNumber} saved and sent to the doctor.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send this patient back to the doctor.");
    } finally {
      setReissuingId("");
    }
  }

  async function issueMedicines(visit: ReceptionVisit) {
    setError("");
    setIssuingId(visit.id);
    try {
      await markReceptionMedicineIssued(visit.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save medicine issue.");
    } finally {
      setIssuingId("");
    }
  }

  function selectDraftMedicine(medicineId: string) {
    const medicine = availableMedicines.find((item) => item.id === medicineId);
    if (!medicine) return;
    setDraftMedicineId(medicine.id);
    setDraftQuantity("");
    setDraftDosage("");
    setDraftInstructions("");
    setMedicineQuery("");
  }

  function addDraftMedicine() {
    const medicine = availableMedicines.find((item) => item.id === draftMedicineId);
    const quantity = Number(draftQuantity);
    if (!medicine) { setError("Select a medicine from the in-stock list first."); return; }
    if (!Number.isSafeInteger(quantity) || quantity < 1) { setError("Enter the quantity for this medicine."); return; }
    if (quantity > stockQuantity(medicine)) { setError(`${medicine.name} has only ${stockQuantity(medicine)} ${medicine.unit}(s) in stock.`); return; }
    setError("");
    setPrescriptionItems((current) => [...current, {
      medicineId: medicine.id,
      medicineName: medicine.name,
      quantity,
      dosage: draftDosage.trim(),
      instructions: draftInstructions.trim(),
    }]);
    setDraftMedicineId("");
    setDraftQuantity("");
    setDraftDosage("");
    setDraftInstructions("");
    setMedicineQuery("");
  }

  function startPrescription(visit: ReceptionVisit) {
    setError("");
    setNotice("");
    setEditingPrescriptionId(visit.id);
    setPrescriptionItems([]);
    setDraftMedicineId("");
    setDraftQuantity("");
    setMedicineQuery("");
    setFollowUpDays("");
  }

  async function saveDoctorPrescription(visit: ReceptionVisit) {
    setError("");
    if (prescriptionItems.length === 0) { setError("Add the medicines written by the doctor first."); return; }
    if (draftMedicineId) { setError("Add the selected medicine to the prescription, or clear it, before saving."); return; }
    if (prescriptionItems.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1)) { setError("Enter a valid quantity for every medicine."); return; }
    const days = Number(followUpDays);
    if (!Number.isSafeInteger(days) || days < 1 || days > 365) { setError("Enter the follow-up interval in days (1–365)."); return; }
    setSavingPrescription(true);
    try {
      const completePrescription = prescriptionItems;
      await saveReceptionPrescription(visit.id, completePrescription, "", undefined, days);
      setEditingPrescriptionId("");
      setPrescriptionItems([]);
      setNotice("Doctor's prescription saved. Stock updated; you can now issue the medicines.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the doctor's prescription.");
    } finally {
      setSavingPrescription(false);
    }
  }

  return (
    <div>
      <PageHeader backHref="/reception" title="Medicine Issue" description="Reception enters the doctor's paper prescription, updates stock, and records medicines handed to the patient." />
      <Card className="mb-4 p-5">
        <label className="block text-sm font-medium text-ths-dark" htmlFor="medicine-issue-search">Patient name, ID or phone number</label>
        <input
          id="medicine-issue-search"
          className={fieldClass + " mt-2"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Patient name, THS ID or phone number"
        />
        <p className="mt-2 text-xs text-muted">{query.trim() ? "Showing matching patient visits." : "Patients registered at reception and sent to the doctor appear below."}</p>
        <p className="mt-1 text-xs text-muted">When the patient returns, enter the doctor's written prescription here. Saving it deducts stock; the final button records that the medicines were handed over.</p>
      </Card>

      {notice && <Card className="mb-4 border border-clinic/20 bg-clinic-soft/50 p-4 text-sm font-medium text-ths-dark">{notice}</Card>}
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}

      {latestPatientRecords.length > 0 && (
        <Card className="mb-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ths-dark">{latestPatientRecords[0].patientName} · ID {patientId(latestPatientRecords[0])}</h2>
              <p className="mt-1 text-sm text-muted">{latestPatientRecords[0].phone || "No phone"} · {latestPatientRecords.length} previous visit(s)</p>
              <p className="mt-2 text-xs text-muted">After the doctor checks the patient, use the visit below to enter the written prescription. For a new return visit, create a token at Reception first.</p>
            </div>
            <button type="button" disabled={!!reissuingId} onClick={() => void requestReissue(latestPatientRecords[0])} className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {reissuingId ? "Saving…" : "Register return visit at Reception"}
            </button>
          </div>
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {latestPatientRecords.slice(0, 5).map((visit) => (
              <li key={visit.id} className="py-3 text-sm">
                <p className="font-medium">{formatDateTime(visit.createdAt)} · {visitState(visit)}</p>
                {visit.prescription?.length ? <p className="mt-1 text-muted">Medicines: {visit.prescription.map((item) => `${item.medicineName} · qty ${item.quantity} · ${item.dosage}${item.durationDays ? ` for ${item.durationDays} days` : ""}`).join("; ")}</p> : null}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-3">
        {visits.length === 0 ? (
          <Card><EmptyState title={!receptionVisitsLoaded ? "Loading patient visits…" : query.trim() ? "No matching patient" : "No patients waiting"} body={!receptionVisitsLoaded ? "Checking the latest Reception visits in Firebase." : query.trim() ? "Search by patient name, THS ID or phone number." : "New patients sent from Reception and prescriptions ready to issue appear here. Use the paper prescription button to enter the doctor's handwritten medicines."} /></Card>
        ) : visits.map((visit) => (
          <Card key={visit.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ths-dark">{visit.patientName}</h2>
                <p className="mt-1 text-sm text-muted">ID {patientId(visit)} · {visit.phone || "No phone"} · {visit.slipNumber} · {formatDateTime(visit.createdAt)}</p>
                <p className="mt-1 text-xs font-medium text-clinic">{visitState(visit)}</p>
              </div>
              {visit.status === "waiting_doctor" && editingPrescriptionId !== visit.id && (
                <button type="button" onClick={() => startPrescription(visit)} className="rounded-lg bg-clinic px-4 py-2.5 text-sm font-semibold text-white hover:bg-clinic-dark">
                  Enter doctor&apos;s paper prescription
                </button>
              )}
              {visit.status === "waiting_reception" && (
                <button
                  type="button"
                  disabled={issuingId === visit.id}
                  onClick={() => void issueMedicines(visit)}
                  className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white hover:bg-ths-dark disabled:opacity-60"
                >
                  {issuingId === visit.id ? "Saving…" : "Save & issue medicines"}
                </button>
              )}
            </div>
            {editingPrescriptionId === visit.id && visit.status === "waiting_doctor" && (
              <section className="mt-4 rounded-xl border border-clinic/20 bg-clinic-soft/30 p-4">
                <h3 className="font-semibold text-ths-dark">Doctor checked the patient · enter written prescription</h3>
                <p className="mt-1 text-xs text-muted">Enter only what the doctor wrote. The system checks stock and saves the prescription to Firestore.</p>
                <div className="mt-3">
                  <MedicineNameAutocomplete label={prescriptionItems.length ? "Select the next medicine" : "Select a medicine from the doctor's paper prescription"} medicines={availableMedicines} inventoryOnly value={medicineQuery} onChange={setMedicineQuery} onSelectMedicine={(medicine) => { if (medicine.medicineId) selectDraftMedicine(medicine.medicineId); }} />
                  <p className="mt-1 text-xs text-muted">Add each medicine separately with its own quantity and instructions. Then select the next medicine. The full list is saved to the patient record; nothing is printed.</p>
                  {availableMedicines.length === 0 && <p className="mt-2 text-sm text-warning">No in-date medicine is in stock.</p>}
                </div>
                {draftMedicineId && (() => {
                  const medicine = availableMedicines.find((item) => item.id === draftMedicineId);
                  if (!medicine) return null;
                  return <div className="mt-3 rounded-xl border border-clinic/30 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-ths-dark">{medicine.name} <span className="font-normal text-muted">· in stock: {stockQuantity(medicine)} {medicine.unit}(s)</span></h4>
                      <button type="button" className="text-sm text-muted underline" onClick={() => { setDraftMedicineId(""); setMedicineQuery(""); }}>Cancel this medicine</button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label={`Quantity to issue (${medicine.unit})`}><input className={fieldClass + " mt-1"} type="number" min="1" max={stockQuantity(medicine)} step="1" value={draftQuantity} onChange={(event) => setDraftQuantity(event.target.value)} placeholder="Enter this medicine's quantity" /></Field>
                      <Field label="Dose / directions (optional)"><input className={fieldClass + " mt-1"} value={draftDosage} onChange={(event) => setDraftDosage(event.target.value)} placeholder="e.g. 1 tablet morning and night for 3 days" /></Field>
                      <div className="sm:col-span-2"><Field label="Extra instructions (optional)"><input className={fieldClass + " mt-1"} value={draftInstructions} onChange={(event) => setDraftInstructions(event.target.value)} placeholder="e.g. after food" /></Field></div>
                    </div>
                    <button type="button" onClick={addDraftMedicine} className="mt-3 rounded-lg bg-clinic px-4 py-2.5 text-sm font-semibold text-white hover:bg-clinic-dark">Add medicine to list</button>
                  </div>;
                })()}
                {prescriptionItems.length > 0 && <div className="mt-3 space-y-2">
                  <h4 className="text-sm font-semibold text-ths-dark">Medicines added to this prescription ({prescriptionItems.length})</h4>
                  {prescriptionItems.map((item, index) => (
                    <div key={`${item.medicineId}-${index}`} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-white p-3">
                      <div><p className="font-semibold text-ths-dark">{item.medicineName} · quantity {item.quantity} {availableMedicines.find((medicine) => medicine.id === item.medicineId)?.unit || "unit"}(s)</p><p className="mt-1 text-sm text-muted">{item.dosage || "No dose directions entered"}{item.instructions ? ` · ${item.instructions}` : ""}</p></div>
                      <button type="button" className="text-sm text-danger" onClick={() => setPrescriptionItems((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>Remove</button>
                    </div>
                  ))}
                </div>}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Return after (days)"><input className={fieldClass + " mt-1"} type="number" min="1" max="365" value={followUpDays} onChange={(event) => setFollowUpDays(event.target.value)} placeholder="e.g. 7" /></Field>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={savingPrescription} onClick={() => void saveDoctorPrescription(visit)} className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{savingPrescription ? "Saving…" : "Save prescription & update stock"}</button>
                  <button type="button" disabled={savingPrescription} onClick={() => setEditingPrescriptionId("")} className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold">Cancel</button>
                </div>
              </section>
            )}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-ths-dark">Doctor's medicines</h3>
              {visit.prescription?.length ? (
                <ul className="mt-2 space-y-2">
                  {visit.prescription.map((medicine, index) => (
                    <li key={medicine.medicineId + "-" + index} className="flex flex-wrap justify-between gap-x-4 rounded-lg border border-line px-3 py-2 text-sm">
                      <span className="font-medium">{medicine.medicineName} · quantity {medicine.quantity}</span>
                      <span className="text-muted">{medicine.dosage}{medicine.instructions ? " · " + medicine.instructions : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-muted">No medicine recorded on this visit.</p>}
            </div>
            {visit.followUpDays ? <p className="mt-3 rounded-lg bg-ths-soft px-3 py-2 text-sm font-medium text-ths-dark">Tell the patient to return after {visit.followUpDays} day(s){visit.followUpDate ? " · " + formatDateTime(visit.followUpDate) : ""}.</p> : null}
            {visit.status === "medicine_issued" && visit.medicineIssuedAt && <p className="mt-3 text-xs text-muted">Issue saved · {formatDateTime(visit.medicineIssuedAt)}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
