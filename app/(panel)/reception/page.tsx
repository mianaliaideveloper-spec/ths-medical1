"use client";

import { useMemo, useState } from "react";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { RECEPTION_SLIP_FEE_PKR } from "@/lib/reception";
import { formatDateTime, todayIso } from "@/lib/format";
import { printReceptionSlip } from "@/lib/print";

const blank = {
  patientName: "",
  cnic: "",
  age: "",
  complaint: "",
  phone: "",
};

export default function ReceptionPage() {
  const { receptionVisits, registerReceptionVisit } = useStore();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const today = todayIso();
  const todayVisits = useMemo(
    () => receptionVisits.filter((item) => item.createdAt.slice(0, 10) === today),
    [receptionVisits, today],
  );

  function set(key: keyof typeof blank, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.patientName.trim() || !form.cnic.trim() || !form.complaint.trim()) {
      setError("Patient name, CNIC, and complaint are required.");
      return;
    }
    const age = Number(form.age);
    if (!age || age <= 0 || age > 120) {
      setError("Enter a valid age (1–120).");
      return;
    }
    setBusy(true);
    try {
      const visit = await registerReceptionVisit({
        patientName: form.patientName,
        cnic: form.cnic,
        age,
        complaint: form.complaint,
        phone: form.phone,
      });
      printReceptionSlip(visit);
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
        title="Reception register"
        description={`Register the patient, print the ${RECEPTION_SLIP_FEE_PKR} PKR slip, and send them to the doctor.`}
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="p-5">
          <h2 className="font-semibold text-ths-dark">New patient</h2>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <Field label="Patient name">
              <input className={fieldClass} value={form.patientName} onChange={(e) => set("patientName", e.target.value)} required />
            </Field>
            <Field label="CNIC">
              <input className={fieldClass} value={form.cnic} onChange={(e) => set("cnic", e.target.value)} required />
            </Field>
            <Field label="Age (years)">
              <input className={fieldClass} type="number" min={1} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} required />
            </Field>
            <Field label="Complaint / illness">
              <textarea
                className={`${fieldClass} min-h-[88px] resize-y`}
                value={form.complaint}
                onChange={(e) => set("complaint", e.target.value)}
                placeholder="What the patient reports…"
                required
              />
            </Field>
            <Field label="Phone (optional)">
              <input className={fieldClass} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <p className="text-xs text-muted">
              Slip fee on print: <strong className="text-ths-dark">{RECEPTION_SLIP_FEE_PKR} PKR</strong> · Data is saved on this desk.
            </p>
            {error && <Notice>{error}</Notice>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white hover:bg-ths-dark disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save & print slip"}
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
                    <th>CNIC</th>
                    <th>Age</th>
                    <th>Complaint</th>
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
                      <td>{item.cnic}</td>
                      <td>{item.age}</td>
                      <td className="max-w-[200px] truncate">{item.complaint}</td>
                      <td>
                        {item.status === "medicine_issued" ? (
                          <span className="text-xs font-medium text-ths">Medicine issued</span>
                        ) : (
                          <span className="text-xs font-medium text-warning">At doctor</span>
                        )}
                      </td>
                      <td>
                        <button type="button" className="text-sm text-clinic" onClick={() => printReceptionSlip(item)}>
                          Reprint
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                  <th>Complaint</th>
                  <th>Fee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {receptionVisits.map((item) => (
                  <tr key={item.id}>
                    <td className="text-xs">{formatDateTime(item.createdAt)}</td>
                    <td className="font-mono text-xs">{item.slipNumber}</td>
                    <td>{item.patientName}</td>
                    <td className="max-w-[180px] truncate">{item.complaint}</td>
                    <td>{item.slipFee} PKR</td>
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
