"use client";

import Link from "next/link";
import { Card, PageHeader } from "@/components/shell";
import { THS_SHEET_MEDICINES } from "@/lib/ths-medicine-sheet-data";

export default function ClinicListPage() {
  const rows = THS_SHEET_MEDICINES;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Sheet1"
        description={`Final THS medicine list — ${rows.length} names (English). Sync from Medicine Master.`}
        action={
          <Link
            href="/medicines"
            className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white hover:bg-ths-dark"
          >
            All medicines & sync
          </Link>
        }
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-ths-soft/40 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Medicine / item</th>
                <th className="px-4 py-3">Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.name} className="border-b border-line/80 last:border-0">
                  <td className="px-4 py-2.5 text-muted">{index + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-ths-dark">{row.name}</td>
                  <td className="px-4 py-2.5 text-muted">{row.itemType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-muted">
        Source:{" "}
        <a
          className="text-clinic hover:underline"
          href="https://docs.google.com/spreadsheets/d/1E5alXvmfh8dGeuI7yGWDzN7mwOaFC6DS/edit"
          target="_blank"
          rel="noreferrer"
        >
          THS Medical Center Medicine (Google Sheet)
        </a>
      </p>
    </div>
  );
}
