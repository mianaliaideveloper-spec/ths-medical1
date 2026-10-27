"use client";

import Link from "next/link";
import { Card, PageHeader } from "@/components/shell";
import { formatDate } from "@/lib/format";
import { THS_SHEET_MEDICINES } from "@/lib/ths-medicine-sheet-data";

export default function ClinicListPage() {
  const rows = THS_SHEET_MEDICINES;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Sheet1"
        description={`THS workbook list — ${rows.length} medicines, with sheet balances, minimum stock, and available expiry dates.`}
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
                <th className="px-4 py-3">Minimum stock</th>
                <th className="px-4 py-3">Sheet balance</th>
                <th className="px-4 py-3">Expiry date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.name} className="border-b border-line/80 last:border-0">
                  <td className="px-4 py-2.5 text-muted">{index + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-ths-dark">{row.name}</td>
                  <td className="px-4 py-2.5 text-muted">{row.itemType}</td>
                  <td className="px-4 py-2.5">{row.minimumStock ?? "—"}</td>
                  <td className="px-4 py-2.5">{row.currentQuantity ?? "—"}</td>
                  <td className="px-4 py-2.5">{formatDate(row.expiryDate)}</td>
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
          href="https://docs.google.com/spreadsheets/d/1lTdoDTwg7DhF6VHFY_KBHFPHqxjz2OO9/edit"
          target="_blank"
          rel="noreferrer"
        >
          THS Medical Center Medicine Database (Google Sheet)
        </a>
      </p>
    </div>
  );
}
