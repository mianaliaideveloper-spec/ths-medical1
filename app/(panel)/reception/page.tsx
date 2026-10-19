"use client";

import { useMemo, useState } from "react";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { formatDateTime, todayIso } from "@/lib/format";
import { validateReceptionInput } from "@/lib/reception";

const blank = {
  patientName: "",
  age: "",
  phone: "",
};

export default function ReceptionPage() {
  const { receptionVisits, registerReceptionVisit, adjustStock, markReceptionMedicineIssued } = useStore();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [issuingId, setIssuingId] = useState("");

  const today = todayIso();
  const todayVisits = useMemo(
    () => receptionVisits.filter((item) => item.createdAt.slice(0, 10) === today),
    [receptionVisits, today],
  );

  function set(key: keyof typeof blank, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function issueMedicines(id: string) {
    const visit = receptionVisits.find((item) => item.id === id);
    if (!visit?.prescription?.length) return;
    setError(""); setIssuingId(id);
    try {
      for (const item of visit.prescription) {
        await adjustStock(item.medicineId, "out", item.quantity, `Patient ${visit.slipNumber}`);
      }
      await markReceptionMedicineIssued(id);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not issue prescribed medicines."); }
    finally { setIssuingId(""); }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const validated = validateReceptionInput({
        patientName: form.patientName,
        cnic: "",
        age: Number(form.age),
        complaint: "",
        phone: form.phone,
      });
      await registerReceptionVisit(validated);
      setForm(blank);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this visit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Patient Register"
        description="Register the patient and save their token and ID. The visit is sent to the doctor."
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="p-5">
          <h2 className="font-semibold text-ths-dark">New patient</h2>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <Field label="Patient name">
              <input className={fieldClass} value={form.patientName} onChange={(e) => set("patientName", e.target.value)} required />
            </Field>
            <Field label="Age (years)">
              <input className={fieldClass} type="number" min={1} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} required />
            </Field>
            <Field label="Phone (optional)">
              <input className={fieldClass} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <p className="text-xs text-muted">Patient registration is saved automatically with a token and ID.</p>
            {error && <Notice>{error}</Notice>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white hover:bg-ths-dark disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save patient & send to doctor"}
            </button>
          </form>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold text-ths-dark">Today&apos;s register</h2>
            <p className="text-sm text-muted">{todayVisits.length} visit(s) on {today}</p>
          </div>
          {todayVisits.length === 0 ? (
            <EmptyState title="No visits yet today" body="Saved patients will appear here after you register someone." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Slip</th>
                    <th>Patient</th>
                    <th>Age</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {todayVisits.map((item) => (
                    <tr key={item.id}>
                      <td className="text-center font-bold text-ths-dark">{item.tokenNumber}</td>
                      <td className="font-mono text-xs">{item.slipNumber}</td>
                      <td>
                        <p className="font-medium">{item.patientName}</p>
                        <p className="text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                      </td>
                      <td>{item.age}</td>
                      <td>
                        {item.status === "medicine_issued" ? <span className="text-xs font-medium text-ths">Medicine issued</span> : item.status === "waiting_reception" ? <span className="text-xs font-medium text-clinic">Ready at reception</span> : <span className="text-xs font-medium text-warning">At doctor</span>}
                      </td>
                      <td>
                        {item.status === "waiting_reception" && <button type="button" disabled={issuingId === item.id} className="text-sm font-semibold text-ths" onClick={() => void issueMedicines(item.id)}>{issuingId === item.id ? "Saving…" : "Save & issue medicines"}</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {todayVisits.some((visit) => visit.status === "waiting_reception" && visit.prescription?.length) && <div className="border-t border-line px-5 py-3"><h3 className="font-semibold text-ths-dark">Doctor prescriptions to dispense</h3><div className="mt-2 space-y-2">{todayVisits.filter((visit) => visit.status === "waiting_reception").map((visit) => <div key={visit.id} className="rounded-lg bg-ths-soft p-3 text-sm"><b>{visit.slipNumber} · {visit.patientName}</b><ul className="mt-1 list-inside list-disc">{visit.prescription?.map((med, index) => <li key={`${med.medicineId}-${index}`}>{med.medicineName} — {med.quantity} · {med.dosage}{med.instructions ? ` (${med.instructions})` : ""}</li>)}</ul>{visit.doctorNote && <p className="mt-1 text-muted">Doctor: {visit.doctorNote}</p>}</div>)}</div></div>}
        </Card>
      </div>

      {receptionVisits.length > todayVisits.length && (
        <Card className="mt-4">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold text-ths-dark">All saved visits</h2>
            <p className="text-sm text-muted">{receptionVisits.length} total on this computer / account</p>
          </div>
          <div className="table-wrap max-h-[420px] overflow-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Slip</th>
                  <th>Patient</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {receptionVisits.map((item) => (
                  <tr key={item.id}>
                    <td className="text-xs">{formatDateTime(item.createdAt)}</td>
                    <td className="font-mono text-xs">{item.slipNumber}</td>
                    <td>{item.patientName}</td>
                    <td>{item.status === "medicine_issued" ? "Done" : "Doctor"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
