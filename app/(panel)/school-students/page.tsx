"use client";

import { useMemo, useState } from "react";
import { Card, EmptyState, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { isLocalAdmin } from "@/lib/desk";
import { formatDateTime } from "@/lib/format";
import type { SchoolStudent } from "@/lib/types";

const blank = { studentName: "", schoolName: "", className: "", phone: "" };

export default function SchoolStudentsPage() {
  const { schoolStudents, registerSchoolStudent, user } = useStore();
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedStudent, setSavedStudent] = useState<SchoolStudent | null>(null);
  const firebaseUnavailable = isLocalAdmin(user?.uid);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return schoolStudents;
    return schoolStudents.filter((student) =>
      [student.studentName, student.schoolName, student.className, student.phone]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [schoolStudents, search]);

  function set(key: keyof typeof blank, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSavedStudent(null);
    setBusy(true);
    try {
      const student = await registerSchoolStudent(form);
      setSavedStudent(student);
      setForm(blank);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this student.");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <PageHeader title="School Student Register" description="School students are registered free of cost." />
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Card className="p-5">
        <h2 className="font-semibold text-ths-dark">Register a student</h2>
        <p className="mt-1 text-sm font-medium text-clinic">Free of cost</p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <Field label="Student name">
            <input className={fieldClass} value={form.studentName} onChange={(event) => set("studentName", event.target.value)} required />
          </Field>
          <Field label="School name">
            <input className={fieldClass} value={form.schoolName} onChange={(event) => set("schoolName", event.target.value)} required />
          </Field>
          <Field label="Class / grade">
            <input className={fieldClass} value={form.className} onChange={(event) => set("className", event.target.value)} placeholder="e.g. Class 5" required />
          </Field>
          <Field label="Phone number">
            <input className={fieldClass} type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} required />
          </Field>
          {error && <Notice>{error}</Notice>}
          {savedStudent && <p className="rounded-lg bg-ths-soft p-3 text-sm font-semibold text-ths-dark">Student saved in Firebase · Free of cost</p>}
          <button type="submit" disabled={busy || firebaseUnavailable} className="w-full rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white hover:bg-ths-dark disabled:opacity-60">
            {busy ? "Saving…" : "Save student"}
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-ths-dark">Registered students</h2>
            <p className="text-sm text-muted">{schoolStudents.length} student(s) · Free of cost</p>
          </div>
          <input className={`${fieldClass} sm:max-w-xs`} aria-label="Search students" placeholder="Search name, school or phone" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        {filteredStudents.length === 0 ? (
          <EmptyState title={schoolStudents.length ? "No matching students" : "No students registered yet"} body={schoolStudents.length ? "Try a different name, school, or phone number." : "Firebase-registered students will appear here."} />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Student name</th><th>School</th><th>Class</th><th>Phone number</th><th>Fee</th><th>Registered</th></tr></thead>
              <tbody>{filteredStudents.map((student) => <tr key={student.id}>
                <td className="font-medium">{student.studentName}</td>
                <td>{student.schoolName}</td>
                <td>{student.className}</td>
                <td>{student.phone}</td>
                <td className="font-medium text-clinic">Free</td>
                <td className="text-xs">{formatDateTime(student.createdAt)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  </div>;
}
