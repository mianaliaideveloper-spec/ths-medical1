"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { dateInPakistan, formatDateTime, todayIso } from "@/lib/format";
import { validateReceptionInput } from "@/lib/reception";
import type { ReceptionVisit } from "@/lib/types";

const blank = {
  patientNumber: "",
  patientName: "",
  age: "",
  phone: "",
};

const SAVED_VISIT_PAGE_SIZE = 50;

function patientDisplayId(visit: ReceptionVisit) {
  return visit.patientNumber || visit.patientId || "—";
}

function statusLabel(visit: ReceptionVisit) {
  if (visit.status === "medicine_issued") return "Medicine issued";
  if (visit.status === "waiting_reception") return "Ready at reception";
  return "At doctor";
}

export default function ReceptionPage() {
  const { receptionVisits, registerReceptionVisit, markReceptionMedicineIssued } = useStore();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [issuingId, setIssuingId] = useState("");
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(SAVED_VISIT_PAGE_SIZE);
  const [patientSearch, setPatientSearch] = useState("");
  const [searchedPatientNumber, setSearchedPatientNumber] = useState("");
  const [printVisit, setPrintVisit] = useState<ReceptionVisit | null>(null);

  const today = todayIso();
  const todayVisits = useMemo(
    () => receptionVisits.filter((item) => dateInPakistan(item.createdAt) === today),
    [receptionVisits, today],
  );
  const visibleHistory = receptionVisits.slice(0, visibleHistoryCount);
  const searchKey = searchedPatientNumber.trim().toLowerCase();
  const searchResults = useMemo(
    () => searchKey
      ? receptionVisits.filter((visit) =>
          (visit.patientNumber || visit.patientId || "").trim().toLowerCase() === searchKey,
        )
      : [],
    [receptionVisits, searchKey],
  );

  const phoneDigits = form.phone.replace(/\D/g, "");
  const previousRecords = useMemo(() => {
    const patientNumber = form.patientNumber.trim().toLowerCase();
    if (patientNumber) {
      return receptionVisits.filter((visit) => visit.patientNumber?.trim().toLowerCase() === patientNumber);
    }
    return phoneDigits.length >= 7
      ? receptionVisits.filter((visit) => (visit.phone || "").replace(/\D/g, "") === phoneDigits)
      : [];
  }, [form.patientNumber, phoneDigits, receptionVisits]);

  function setFormField(key: keyof typeof blank, value: string) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "patientNumber") {
        const normalized = value.trim().toLowerCase();
        const previous = normalized
          ? receptionVisits.find((visit) => visit.patientNumber?.trim().toLowerCase() === normalized)
          : undefined;
        if (previous) {
          return {
            ...next,
            patientName: previous.patientName,
            age: String(previous.age),
            phone: previous.phone || "",
          };
        }
      }
      if (key === "phone") {
        const digits = value.replace(/\D/g, "");
        const previous = digits.length >= 7
          ? receptionVisits.find((visit) => (visit.phone || "").replace(/\D/g, "") === digits)
          : undefined;
        if (previous) {
          return {
            ...next,
            patientNumber: previous.patientNumber || next.patientNumber,
            patientName: previous.patientName,
            age: String(previous.age),
          };
        }
      }
      return next;
    });
  }

  function selectPatientRecord(visit: ReceptionVisit) {
    setForm({
      patientNumber: visit.patientNumber || "",
      patientName: visit.patientName,
      age: String(visit.age),
      phone: visit.phone || "",
    });
    setError("");
    setSearchedPatientNumber(visit.patientNumber || "");
  }

  function printTokenSlip(visit: ReceptionVisit) {
    setPrintVisit(visit);
    window.setTimeout(() => window.print(), 250);
  }

  async function issueMedicines(id: string) {
    const visit = receptionVisits.find((item) => item.id === id);
    if (!visit?.prescription?.length) return;
    setError("");
    setIssuingId(id);
    try {
      await markReceptionMedicineIssued(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm medicine issue.");
    } finally {
      setIssuingId("");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const validated = validateReceptionInput({
        patientNumber: form.patientNumber,
        patientName: form.patientName,
        cnic: "",
        age: Number(form.age),
        complaint: "",
        phone: form.phone,
      });
      const saved = await registerReceptionVisit(validated);
      setForm(blank);
      setPrintVisit(saved);
      window.setTimeout(() => window.print(), 250);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this visit.");
    } finally {
      setBusy(false);
    }
  }

  function searchPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchedPatientNumber(patientSearch.trim());
  }

  return (
    <div>
      <PageHeader
        title="Patient Register"
        description="Assign a patient ID, register the visit, and send the token to the doctor."
      />

      <Card className="mb-4 p-5">
        <h2 className="font-semibold text-ths-dark">Search previous patient</h2>
        <p className="mt-1 text-sm text-muted">Enter the patient ID to see earlier visits and register a return visit.</p>
        <form onSubmit={searchPatient} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className={fieldClass + " sm:max-w-sm"}
            inputMode="numeric"
            value={patientSearch}
            onChange={(event) => setPatientSearch(event.target.value)}
            placeholder="Patient ID number"
            aria-label="Search patient by ID"
          />
          <button type="submit" className="rounded-lg bg-clinic px-5 py-2.5 text-sm font-semibold text-white hover:bg-clinic-dark">
            Search
          </button>
        </form>
        {searchedPatientNumber && (
          <div className="mt-4">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted">No saved patient found with ID {searchedPatientNumber}.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-ths-dark">{searchResults[0].patientName} · Patient ID {patientDisplayId(searchResults[0])} · {searchResults.length} saved visit(s)</p>
                {searchResults.slice(0, 5).map((visit) => (
                  <div key={visit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm">
                    <div>
                      <p>{formatDateTime(visit.createdAt)} · {visit.slipNumber} · {statusLabel(visit)}</p>
                      {visit.prescription?.length ? <p className="mt-1 text-xs text-muted">Medicines: {visit.prescription.map((item) => item.medicineName).join(", ")}</p> : null}
                      {visit.followUpDays ? <p className="mt-1 text-xs text-muted">Return after {visit.followUpDays} day(s){visit.followUpDate ? " · " + formatDateTime(visit.followUpDate) : ""}</p> : null}
                    </div>
                    <button type="button" className="text-sm font-semibold text-clinic" onClick={() => selectPatientRecord(visit)}>
                      Use for return visit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {printVisit && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-ths-dark">
            Saved: token {printVisit.tokenNumber} · patient ID {patientDisplayId(printVisit)} · {printVisit.patientName}
          </p>
          <button type="button" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ths-dark" onClick={() => printTokenSlip(printVisit)}>
            Print token slip
          </button>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="p-5">
          <h2 className="font-semibold text-ths-dark">Register visit</h2>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <Field label="Patient ID (assigned by reception)">
              <input
                className={fieldClass}
                value={form.patientNumber}
                onChange={(event) => setFormField("patientNumber", event.target.value)}
                inputMode="numeric"
                maxLength={20}
                placeholder="e.g. 1, 2, 3"
                required
              />
            </Field>
            <Field label="Patient name">
              <input className={fieldClass} value={form.patientName} onChange={(event) => setFormField("patientName", event.target.value)} required />
            </Field>
            <Field label="Age (years)">
              <input className={fieldClass} type="number" min={1} max={120} value={form.age} onChange={(event) => setFormField("age", event.target.value)} required />
            </Field>
            <Field label="Phone (optional)">
              <input className={fieldClass} type="tel" value={form.phone} onChange={(event) => setFormField("phone", event.target.value)} />
            </Field>
            {previousRecords.length > 0 && (
              <div className="rounded-lg border border-clinic/20 bg-clinic-soft/50 p-3 text-sm">
                <p className="font-semibold text-ths-dark">Previous patient records · ID {patientDisplayId(previousRecords[0])}</p>
                <ul className="mt-2 space-y-2">
                  {previousRecords.slice(0, 4).map((visit) => (
                    <li key={visit.id} className="border-t border-clinic/10 pt-2">
                      <div className="flex flex-wrap justify-between gap-x-3">
                        <span>{visit.patientName} · {visit.age} years</span>
                        <span className="text-xs text-muted">{formatDateTime(visit.createdAt)}</span>
                      </div>
                      <p className="text-xs text-muted">{visit.slipNumber} · {statusLabel(visit)}</p>
                      {visit.prescription?.length ? <p className="mt-1">Medicines: {visit.prescription.map((item) => item.medicineName).join(", ")}</p> : null}
                      {visit.followUpDays ? <p className="mt-1 text-xs text-muted">Return after {visit.followUpDays} day(s){visit.followUpDate ? " · " + formatDateTime(visit.followUpDate) : ""}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted">This visit will get a daily token and be sent to the doctor.</p>
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
                    <th>Patient ID</th>
                    <th>Token</th>
                    <th>Slip</th>
                    <th>Patient</th>
                    <th>Age</th>
                    <th>Next visit</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {todayVisits.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono text-xs">{patientDisplayId(item)}</td>
                      <td className="text-center font-bold text-ths-dark">{item.tokenNumber}</td>
                      <td className="font-mono text-xs">{item.slipNumber}</td>
                      <td>
                        <p className="font-medium">{item.patientName}</p>
                        <p className="text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                      </td>
                      <td>{item.age}</td>
                      <td className="text-xs">{item.followUpDays ? item.followUpDays + " day(s)" : "—"}{item.followUpDate ? <span className="block text-muted">{formatDateTime(item.followUpDate)}</span> : null}</td>
                      <td><span className="text-xs font-medium text-ths">{statusLabel(item)}</span></td>
                      <td>
                        {item.status === "waiting_reception" && (
                          <button type="button" disabled={issuingId === item.id} className="text-sm font-semibold text-ths" onClick={() => void issueMedicines(item.id)}>
                            {issuingId === item.id ? "Saving…" : "Save & issue medicines"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {todayVisits.some((visit) => visit.status === "waiting_reception" && visit.prescription?.length) && (
            <div className="border-t border-line px-5 py-3">
              <h3 className="font-semibold text-ths-dark">Doctor prescriptions to dispense</h3>
              <div className="mt-2 space-y-2">
                {todayVisits.filter((visit) => visit.status === "waiting_reception").map((visit) => (
                  <div key={visit.id} className="rounded-lg bg-ths-soft p-3 text-sm">
                    <b>Patient ID {patientDisplayId(visit)} · {visit.slipNumber} · {visit.patientName}</b>
                    <ul className="mt-1 list-inside list-disc">
                      {visit.prescription?.map((med, index) => (
                        <li key={med.medicineId + "-" + index}>
                          {med.medicineName} — {med.quantity} · {med.dosage}{med.instructions ? " (" + med.instructions + ")" : ""}
                        </li>
                      ))}
                    </ul>
                    {visit.doctorNote && <p className="mt-1 text-muted">Doctor: {visit.doctorNote}</p>}
                    {visit.followUpDays ? <p className="mt-1 font-medium text-clinic">Tell the patient to return after {visit.followUpDays} day(s){visit.followUpDate ? " · " + formatDateTime(visit.followUpDate) : ""}.</p> : null}
                    <button type="button" disabled={issuingId === visit.id} className="mt-2 rounded-lg bg-ths px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" onClick={() => void issueMedicines(visit.id)}>
                      {issuingId === visit.id ? "Saving…" : "Save & issue medicines"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {receptionVisits.length > todayVisits.length && (
        <Card className="mt-4">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold text-ths-dark">All saved visits</h2>
            <p className="text-sm text-muted">{receptionVisits.length} total on this account · showing {visibleHistory.length}</p>
          </div>
          <div className="table-wrap max-h-[420px] overflow-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient ID</th>
                  <th>Slip</th>
                  <th>Patient</th>
                  <th>Next visit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="text-xs">{formatDateTime(item.createdAt)}</td>
                    <td className="font-mono text-xs">{patientDisplayId(item)}</td>
                    <td className="font-mono text-xs">{item.slipNumber}</td>
                    <td>{item.patientName}</td>
                    <td className="text-xs">{item.followUpDays ? item.followUpDays + " day(s)" : "—"}{item.followUpDate ? <span className="block text-muted">{formatDateTime(item.followUpDate)}</span> : null}</td>
                    <td>{statusLabel(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleHistory.length < receptionVisits.length && (
            <div className="border-t border-line px-5 py-3 text-center">
              <button
                type="button"
                className="text-sm font-semibold text-clinic"
                onClick={() => setVisibleHistoryCount((count) => Math.min(count + SAVED_VISIT_PAGE_SIZE, receptionVisits.length))}
              >
                Load 50 older visits
              </button>
            </div>
          )}
        </Card>
      )}

      {printVisit && (
        <section className="reception-token-slip" aria-hidden="true">
          <div className="border-b border-black pb-3 text-center">
            <h1 className="text-xl font-bold">THS Medical Center</h1>
            <p className="mt-1 text-sm">Patient token slip</p>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p><b>Patient ID:</b> {patientDisplayId(printVisit)}</p>
            <p><b>Token number:</b> {printVisit.tokenNumber}</p>
            <p><b>Slip:</b> {printVisit.slipNumber}</p>
            <p><b>Patient:</b> {printVisit.patientName}</p>
            <p><b>Age:</b> {printVisit.age} years</p>
            {printVisit.phone && <p><b>Phone:</b> {printVisit.phone}</p>}
            <p><b>Registered:</b> {formatDateTime(printVisit.createdAt)}</p>
          </div>
          <p className="mt-5 border-t border-black pt-3 text-center text-xs">Please show this token slip to the doctor.</p>
        </section>
      )}
    </div>
  );
}
