"use client";

import { useMemo, useState } from "react";
import { Card, EmptyState, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { formatDateTime } from "@/lib/format";
import type { ReceptionVisit } from "@/lib/types";

function patientId(visit: ReceptionVisit) {
  return visit.patientNumber || visit.patientId || "—";
}

function visitState(visit: ReceptionVisit) {
  if (visit.status === "medicine_issued") return "Medicines issued";
  if (visit.status === "waiting_reception") return "Ready to issue";
  return "At doctor";
}

export default function MedicineIssuePage() {
  const { receptionVisits, markReceptionMedicineIssued } = useStore();
  const [query, setQuery] = useState("");
  const [issuingId, setIssuingId] = useState("");
  const [error, setError] = useState("");

  const visits = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const digits = normalized.replace(/\D/g, "");
    if (!normalized) return receptionVisits.filter((visit) => visit.status === "waiting_reception");
    return receptionVisits.filter((visit) => {
      const id = (visit.patientNumber || visit.patientId || "").toLowerCase();
      const phone = (visit.phone || "").replace(/\D/g, "");
      return id.includes(normalized) || (digits.length >= 4 && phone.includes(digits));
    });
  }, [query, receptionVisits]);

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

  return (
    <div>
      <PageHeader title="Medicine Issue" description="Search by THS patient ID or phone, review the doctor's prescription, and save medicine issue." />
      <Card className="mb-4 p-5">
        <label className="block text-sm font-medium text-ths-dark" htmlFor="medicine-issue-search">Patient ID or phone number</label>
        <input
          id="medicine-issue-search"
          className={fieldClass + " mt-2"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="THS-001 or phone number"
        />
        <p className="mt-2 text-xs text-muted">{query.trim() ? "Showing matching patient visits." : "Patients sent back by the doctor appear below."}</p>
        <p className="mt-1 text-xs text-muted">Stock is reduced when the doctor saves the prescription. Saving here records that the medicines were handed to the patient.</p>
      </Card>

      {error && <div className="mb-4"><Notice>{error}</Notice></div>}

      <div className="space-y-3">
        {visits.length === 0 ? (
          <Card><EmptyState title={query.trim() ? "No matching patient" : "No medicines waiting"} body={query.trim() ? "Check the patient ID or phone number and search again." : "Doctor prescriptions will appear here after the doctor sends them to reception."} /></Card>
        ) : visits.map((visit) => (
          <Card key={visit.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ths-dark">{visit.patientName}</h2>
                <p className="mt-1 text-sm text-muted">ID {patientId(visit)} · {visit.phone || "No phone"} · {visit.slipNumber} · {formatDateTime(visit.createdAt)}</p>
                <p className="mt-1 text-xs font-medium text-clinic">{visitState(visit)}</p>
              </div>
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
            {visit.complaint && <p className="mt-4 rounded-lg bg-clinic-soft/60 p-3 text-sm"><b>Problem:</b> {visit.complaint}</p>}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-ths-dark">Doctor's medicines</h3>
              {visit.prescription?.length ? (
                <ul className="mt-2 space-y-2">
                  {visit.prescription.map((medicine, index) => (
                    <li key={medicine.medicineId + "-" + index} className="flex flex-wrap justify-between gap-x-4 rounded-lg border border-line px-3 py-2 text-sm">
                      <span className="font-medium">{medicine.medicineName} · {medicine.quantity}</span>
                      <span className="text-muted">{medicine.dosage}{medicine.instructions ? " · " + medicine.instructions : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-muted">No medicine recorded on this visit.</p>}
            </div>
            {visit.doctorNote && <p className="mt-3 text-sm text-muted"><b>Doctor's note:</b> {visit.doctorNote}</p>}
            {visit.followUpDays ? <p className="mt-3 rounded-lg bg-ths-soft px-3 py-2 text-sm font-medium text-ths-dark">Tell the patient to return after {visit.followUpDays} day(s){visit.followUpDate ? " · " + formatDateTime(visit.followUpDate) : ""}.</p> : null}
            {visit.status === "medicine_issued" && visit.medicineIssuedAt && <p className="mt-3 text-xs text-muted">Issue saved · {formatDateTime(visit.medicineIssuedAt)}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
