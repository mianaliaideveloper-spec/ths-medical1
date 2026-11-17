"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { formatDateTime } from "@/lib/format";
import type { SchoolStudent } from "@/lib/types";

export default function StudentMedicineIssuePage() {
  const { medicines, movements, schoolStudents, issueSchoolStudentMedicine } = useStore();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<SchoolStudent | null>(null);
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState("1");
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
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await issueSchoolStudentMedicine(selectedStudent.studentNumber || selectedStudent.id, medicineId, Number(quantity), note);
      setSuccess(`${quantity} ${selectedMedicine?.unit || "unit(s)"} of ${selectedMedicine?.name || "medicine"} saved for ${selectedStudent.studentName}.`);
      setMedicineId("");
      setQuantity("1");
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this student medicine issue.");
    } finally {
      setSaving(false);
    }
  }

  return <div>
    <PageHeader
      title="Student Medicine Issue"
      description="Issue medicines to registered THS, IPS, or APEX students. Student issues are saved separately from patient prescriptions."
      action={<Link href="/school-students" className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ths-dark hover:bg-ths-soft">Student Register</Link>}
    />

    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card className="p-5">
        <h2 className="font-semibold text-ths-dark">Find student and issue medicine</h2>
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
          <Field label="Quantity">
            <input className={fieldClass} type="number" min="1" max={selectedMedicine?.quantity || undefined} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
          </Field>
          <Field label="Note (optional)">
            <input className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reason or short note" />
          </Field>
          {error && <Notice>{error}</Notice>}
          {success && <p role="status" className="rounded-lg bg-ths-soft p-3 text-sm font-medium text-ths-dark">{success}</p>}
          <button type="submit" disabled={saving || !selectedStudent || !medicineId || !availableMedicines.length} className="w-full rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white hover:bg-ths-dark disabled:opacity-60">
            {saving ? "Saving issue…" : "Save student medicine issue"}
          </button>
          <p className="text-xs text-muted">This updates stock and records the issue under the selected student. It does not add it to patient prescriptions.</p>
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
              <thead><tr><th>Date</th><th>Student</th><th>Medicine</th><th>Quantity</th><th>Stock after issue</th><th>Note</th></tr></thead>
              <tbody>{studentMovements.map((movement) => <tr key={movement.id}>
                <td className="whitespace-nowrap text-xs">{formatDateTime(movement.createdAt)}</td>
                <td>{movement.schoolStudentName}<span className="block text-xs text-muted">ID {movement.schoolStudentId} · {movement.schoolName} · {movement.className}</span></td>
                <td className="font-medium">{movement.medicineName}</td>
                <td>{movement.quantity}</td>
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
