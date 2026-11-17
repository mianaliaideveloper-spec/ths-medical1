"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { formatDateTime } from "@/lib/format";
import type { MedicationScheduleTime, SchoolStudent, StudentMedicineIssueLine } from "@/lib/types";

const scheduleTimes: { value: MedicationScheduleTime; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

export default function StudentMedicineIssuePage() {
  const { medicines, movements, schoolStudents, issueSchoolStudentMedicine } = useStore();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<SchoolStudent | null>(null);
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [dosage, setDosage] = useState("");
  const [schedule, setSchedule] = useState<MedicationScheduleTime[]>([]);
  const [durationDays, setDurationDays] = useState("");
  const [issueItems, setIssueItems] = useState<StudentMedicineIssueLine[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const matchingStudents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle || selectedStudent) return [];
    return schoolStudents.filter((student) =>
      [student.studentNumber || student.id, student.studentName, student.schoolName, student.className, student.phone]
        .some((value) => value.toLowerCase().includes(needle)),
    ).slice(0, 8);
  }, [schoolStudents, search, selectedStudent]);

  const availableMedicines = useMemo(
    () => medicines.filter((medicine) => medicine.quantity > 0).sort((a, b) => a.name.localeCompare(b.name)),
    [medicines],
  );
  const selectedMedicine = availableMedicines.find((medicine) => medicine.id === medicineId);
  const studentMovements = useMemo(() => {
    const records = movements.filter((movement) => Boolean(movement.schoolStudentId));
    return (selectedStudent
      ? records.filter((movement) => movement.schoolStudentId === (selectedStudent.studentNumber || selectedStudent.id))
      : records).slice(0, 50);
  }, [movements, selectedStudent]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudent) {
      setError("Search for and select a registered student first.");
      return;
    }
    if (medicineId) {
      setError("Add the selected medicine to the list first, or cancel it before saving.");
      return;
    }
    if (!issueItems.length) {
      setError("Select and add at least one medicine before saving.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await issueSchoolStudentMedicine(selectedStudent.studentNumber || selectedStudent.id, issueItems, note);
      setSuccess(`${issueItems.length} medicine(s) saved for ${selectedStudent.studentName}.`);
      setMedicineId("");
      setQuantity("1");
      setDosage("");
      setSchedule([]);
      setDurationDays("");
      setIssueItems([]);
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this student medicine issue.");
    } finally {
      setSaving(false);
    }
  }

  function addMedicineToIssue() {
    setError("");
    const medicine = selectedMedicine;
    const issueQuantity = Number(quantity);
    if (!medicine) { setError("Select a medicine from the available stock."); return; }
    if (!Number.isSafeInteger(issueQuantity) || issueQuantity < 1) { setError("Enter a valid quantity for this medicine."); return; }
    const alreadyAdded = issueItems.filter((item) => item.medicineId === medicine.id).reduce((sum, item) => sum + item.quantity, 0);
    if (alreadyAdded + issueQuantity > medicine.quantity) { setError(`Only ${medicine.quantity - alreadyAdded} ${medicine.unit}(s) of ${medicine.name} remain available for this issue.`); return; }
    const days = durationDays ? Number(durationDays) : undefined;
    if (days !== undefined && (!Number.isSafeInteger(days) || days < 1 || days > 365)) { setError("Enter a duration from 1 to 365 days."); return; }
    setIssueItems((current) => [...current, { medicineId: medicine.id, quantity: issueQuantity, dosage: dosage.trim(), schedule, ...(days ? { durationDays: days } : {}) }]);
    setMedicineId("");
    setQuantity("1");
    setDosage("");
    setSchedule([]);
    setDurationDays("");
  }

  function changeSchedule(time: MedicationScheduleTime, checked: boolean) {
    setSchedule((current) => checked ? [...new Set([...current, time])] : current.filter((item) => item !== time));
  }

  return <div>
    <PageHeader
      title="Student Medicine Issue"
      description="Issue medicines to registered THS, IPS, or APEX students. Student issues are saved separately from patient prescriptions."
      action={<Link href="/school-students" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ths-dark hover:bg-ths-soft">Student Register</Link>}
    />

    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card className="p-5">
        <h2 className="font-semibold text-ths-dark">Find student and build medicine list</h2>
        <label className="mt-4 block text-sm font-medium text-ths-dark" htmlFor="student-issue-search">Student ID, name, or phone</label>
        <div className="mt-1 flex gap-2">
          <input id="student-issue-search" className={fieldClass} placeholder="Search registered students" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedStudent(null); }} />
          {selectedStudent && <button type="button" className="rounded-lg border border-line px-3 text-sm" onClick={() => { setSelectedStudent(null); setSearch(""); }}>Change</button>}
        </div>
        {!selectedStudent && search.trim() && matchingStudents.length > 0 && (
          <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-line">
            {matchingStudents.map((student) => <button key={student.id} type="button" onClick={() => { setSelectedStudent(student); setSearch(`${student.studentNumber || student.id} · ${student.studentName}`); }} className="block w-full border-b border-line px-3 py-2 text-left last:border-0 hover:bg-ths-soft">
              <span className="block text-sm font-semibold text-ths-dark">{student.studentName} · ID {student.studentNumber || student.id}</span>
              <span className="text-xs text-muted">{student.schoolName} · {student.className} · {student.phone}</span>
            </button>)}
          </div>
        )}
        {!selectedStudent && search.trim() && matchingStudents.length === 0 && <p className="mt-2 text-xs text-muted">No matching student found.</p>}
        {selectedStudent && <div className="mt-3 rounded-lg bg-ths-soft p-3 text-sm text-ths-dark"><b>{selectedStudent.studentName}</b><br />ID {selectedStudent.studentNumber || selectedStudent.id} · {selectedStudent.schoolName} · {selectedStudent.className}<br />{selectedStudent.phone}</div>}

        <form onSubmit={(event) => void onSubmit(event)} className="mt-4 space-y-3">
          <Field label="Medicine">
            <select className={fieldClass} value={medicineId} onChange={(event) => setMedicineId(event.target.value)} required>
              <option value="">Select available medicine</option>
              {availableMedicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name} · {medicine.quantity} {medicine.unit} available</option>)}
            </select>
          </Field>
          {selectedMedicine && <p className="-mt-2 text-xs text-muted">Available stock: {selectedMedicine.quantity} {selectedMedicine.unit}{selectedMedicine.shelf ? ` · Location ${selectedMedicine.shelf}` : ""}</p>}
          {selectedMedicine && <>
            <Field label={`Quantity (${selectedMedicine.unit})`}>
              <input className={fieldClass} type="number" min="1" max={selectedMedicine.quantity} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </Field>
            <Field label="Dose / directions (optional)">
              <input className={fieldClass} value={dosage} onChange={(event) => setDosage(event.target.value)} placeholder="e.g. 1 tablet each time" />
            </Field>
            <fieldset><legend className="text-sm font-medium text-ths-dark">Time to take (optional)</legend><div className="mt-2 flex flex-wrap gap-2">{scheduleTimes.map((time) => <label key={time.value} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${schedule.includes(time.value) ? "border-clinic bg-clinic-soft/60 text-ths-dark" : "border-line"}`}><input type="checkbox" checked={schedule.includes(time.value)} onChange={(event) => changeSchedule(time.value, event.target.checked)} />{time.label}</label>)}</div></fieldset>
            <Field label="Duration in days (optional)">
              <input className={fieldClass} type="number" min="1" max="365" step="1" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} placeholder="e.g. 5" />
            </Field>
            <button type="button" onClick={addMedicineToIssue} className="w-full rounded-lg border border-clinic px-4 py-2.5 text-sm font-semibold text-ths-dark hover:bg-clinic-soft/40">Add medicine to list</button>
          </>}
          {issueItems.length > 0 && <div className="space-y-2 rounded-lg border border-line p-3">
            <h3 className="text-sm font-semibold text-ths-dark">Medicines for this student ({issueItems.length})</h3>
            {issueItems.map((item, index) => {
              const medicine = availableMedicines.find((entry) => entry.id === item.medicineId);
              return <div key={`${item.medicineId}-${index}`} className="flex items-start justify-between gap-2 rounded-lg bg-ths-soft/60 p-3 text-sm">
                <div><p className="font-semibold text-ths-dark">{medicine?.name || "Medicine"} · quantity {item.quantity} {medicine?.unit || "unit(s)"}</p><p className="mt-1 text-xs text-muted">{[item.dosage, item.schedule.length ? item.schedule.join(", ") : "", item.durationDays ? `${item.durationDays} days` : ""].filter(Boolean).join(" · ") || "No dose/time details added"}</p></div>
                <button type="button" className="text-xs font-medium text-danger" onClick={() => setIssueItems((current) => current.filter((_, row) => row !== index))}>Remove</button>
              </div>;
            })}
          </div>}
          <Field label="Note for this issue (optional)">
            <input className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Short note shared by the doctor" />
          </Field>
          {error && <Notice>{error}</Notice>}
          {success && <p role="status" className="rounded-lg bg-ths-soft p-3 text-sm font-medium text-ths-dark">{success}</p>}
          <button type="submit" disabled={saving || !selectedStudent || !issueItems.length} className="w-full rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white hover:bg-ths-dark disabled:opacity-60">
            {saving ? "Saving issue…" : `Save all ${issueItems.length || ""} medicines`}
          </button>
          <p className="text-xs text-muted">Add each medicine separately. Saving records every medicine and its own quantity, dose, time, and issue date in Firebase, then updates stock. Nothing is printed.</p>
        </form>
      </Card>

      <Card>
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ths-dark">{selectedStudent ? `Issue history · ${selectedStudent.studentName}` : "Recent student medicine issues"}</h2>
          <p className="text-sm text-muted">Student-only records · latest 50</p>
        </div>
        {studentMovements.length === 0 ? <EmptyState title="No student medicine issues yet" body="Saved issues for school students will appear here. Patient visits and prescriptions are kept separately." /> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Issue date</th><th>Student</th><th>Medicine</th><th>Quantity</th><th>Dose / time / duration</th><th>Stock after issue</th><th>Note</th></tr></thead>
              <tbody>{studentMovements.map((movement) => <tr key={movement.id}>
                <td className="whitespace-nowrap text-xs">{formatDateTime(movement.issueDate || movement.createdAt)}</td>
                <td>{movement.schoolStudentName}<span className="block text-xs text-muted">ID {movement.schoolStudentId} · {movement.schoolName} · {movement.className}</span></td>
                <td className="font-medium">{movement.medicineName}</td>
                <td>{movement.quantity}</td>
                <td className="text-xs">{[movement.dosage, movement.schedule?.join(", "), movement.durationDays ? `${movement.durationDays} days` : ""].filter(Boolean).join(" · ") || "—"}</td>
                <td>{movement.balanceAfter}</td>
                <td className="text-xs">{movement.note}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  </div>;
}
