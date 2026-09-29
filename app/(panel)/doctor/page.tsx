"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, EmptyState, PageHeader } from "@/components/shell";
import { useStore } from "@/components/store";
import { formatDateTime, todayIso } from "@/lib/format";
import { printReceptionSlip } from "@/lib/print";

export default function DoctorDeskPage() {
  const { receptionVisits, markReceptionMedicineIssued } = useStore();
  const today = todayIso();

  const waiting = useMemo(
    () =>
      receptionVisits.filter(
        (item) => item.status === "waiting_doctor" && item.createdAt.slice(0, 10) === today,
      ),
    [receptionVisits, today],
  );

  const doneToday = useMemo(
    () =>
      receptionVisits.filter(
        (item) => item.status === "medicine_issued" && item.createdAt.slice(0, 10) === today,
      ),
    [receptionVisits, today],
  );

  return (
    <div>
      <PageHeader
        title="Doctor desk"
        description="Patients arrive with the reception slip. After check-up, issue medicine from the pharmacy."
        action={
          <Link href="/print" className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white">
            Pharmacy print
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold text-ths-dark">Waiting (today)</h2>
            <p className="text-sm text-muted">{waiting.length} with reception slip</p>
          </div>
          {waiting.length === 0 ? (
            <EmptyState title="No one waiting" body="New slips appear here when reception registers a patient." />
          ) : (
            <ul className="divide-y divide-line">
              {waiting.map((item) => (
                <li key={item.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ths text-lg font-bold text-white"
                        aria-label={`Token ${item.tokenNumber}`}
                      >
                        {item.tokenNumber}
                      </span>
                      <div>
                      <p className="font-semibold text-ths-dark">{item.patientName}</p>
                      <p className="text-xs text-muted">
                        Token {item.tokenNumber} · {item.slipNumber} · CNIC {item.cnic} · Age {item.age}
                      </p>
                      <p className="mt-1 text-sm">{item.complaint}</p>
                      <p className="mt-1 text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium"
                        onClick={() => printReceptionSlip(item)}
                      >
                        View slip
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-clinic px-3 py-1.5 text-xs font-semibold text-white"
                        onClick={() => void markReceptionMedicineIssued(item.id)}
                      >
                        Medicine issued
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold text-ths-dark">Completed today</h2>
            <p className="text-sm text-muted">{doneToday.length} medicine issued</p>
          </div>
          {doneToday.length === 0 ? (
            <EmptyState title="None completed yet" body="Mark “Medicine issued” after pharmacy gives medicines." />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {doneToday.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 px-5 py-3">
                  <span>
                    <span className="font-medium">{item.patientName}</span>
                    <span className="text-muted"> · Token {item.tokenNumber} · {item.slipNumber}</span>
                  </span>
                  <span className="text-xs text-muted">
                    {item.medicineIssuedAt ? formatDateTime(item.medicineIssuedAt) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
