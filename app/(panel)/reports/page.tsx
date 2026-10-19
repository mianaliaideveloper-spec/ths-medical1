"use client";

import { Card, PageHeader } from "@/components/shell";
import { inventorySummary, useStore } from "@/components/store";
import { buildDailyReportRows, dailyReportSummary } from "@/lib/daily-report";
import { exportExcel, exportPdf } from "@/lib/export";
import { formatDate, formatPkr, stockStatus, todayIso } from "@/lib/format";

export default function ReportsPage() {
  const { medicines, movements } = useStore();
  const summary = inventorySummary(medicines);
  const day = todayIso();
  const daily = dailyReportSummary(movements, day);
  const dailyRows = buildDailyReportRows(movements, day);

  function excel() {
    exportExcel("ths-medicine-inventory.xlsx", "Inventory", medicines.map((item) => ({
      Medicine: item.name,
      Generic: item.genericName,
      Strength: item.strength,
      "Mfg date": item.manufacturingDate,
      "Purchase price": item.purchasePrice,
      "Sale price": item.salePrice,
      Quantity: item.quantity,
      Expiry: item.expiryDate,
      Supplier: item.supplierName,
      Status: stockStatus(item),
    })));
  }

  function pdf() {
    exportPdf(
      "ths-medicine-inventory.pdf",
      "Inventory report",
      ["Medicine", "Generic", "Strength", "Qty", "Mfg", "Expiry", "Sale", "Supplier"],
      medicines.map((item) => [
        item.name,
        item.genericName,
        item.strength,
        item.quantity,
        item.manufacturingDate ? formatDate(item.manufacturingDate) : "—",
        formatDate(item.expiryDate),
        formatPkr(item.salePrice),
        item.supplierName,
      ]),
    );
  }

  function dailyExcel() {
    exportExcel(
      `ths-daily-report-${day}.xlsx`,
      "Daily",
      dailyRows.map((row) => ({
        Time: row.time,
        Medicine: row.medicine,
        Type: row.type,
        Quantity: row.quantity,
        Note: row.note,
        By: row.by,
      })),
    );
  }

  function dailyPdf() {
    exportPdf(
      `ths-daily-report-${day}.pdf`,
      `Daily report · ${formatDate(day)}`,
      ["Time", "Medicine", "Type", "Qty", "Note", "By"],
      dailyRows.map((row) => [row.time, row.medicine, row.type, row.quantity, row.note, row.by]),
    );
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Full inventory exports and today’s stock activity."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={excel} className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white">Export Excel</button>
            <button type="button" onClick={pdf} className="rounded-lg bg-clinic px-4 py-2.5 text-sm font-semibold text-white">Export PDF</button>
          </div>
        }
      />

      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ths-dark">Daily report</h2>
            <p className="mt-1 text-sm text-muted">Stock movements for {formatDate(day)}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={dailyExcel} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold">
              Daily Excel
            </button>
            <button type="button" onClick={dailyPdf} className="rounded-lg bg-clinic px-3 py-2 text-sm font-semibold text-white">
              Daily PDF
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-ths-soft/50 px-3 py-2 text-sm">
            <p className="text-muted">Movements</p>
            <p className="text-lg font-semibold text-ths-dark">{daily.totalMovements}</p>
          </div>
          <div className="rounded-lg bg-ths-soft/50 px-3 py-2 text-sm">
            <p className="text-muted">Stock in (units)</p>
            <p className="text-lg font-semibold text-ths-dark">{daily.stockIn}</p>
          </div>
          <div className="rounded-lg bg-ths-soft/50 px-3 py-2 text-sm">
            <p className="text-muted">Stock out (units)</p>
            <p className="text-lg font-semibold text-ths-dark">{daily.stockOut}</p>
          </div>
          <div className="rounded-lg bg-ths-soft/50 px-3 py-2 text-sm">
            <p className="text-muted">Adjustments</p>
            <p className="text-lg font-semibold text-ths-dark">{daily.adjustments}</p>
          </div>
        </div>
        {dailyRows.length > 0 && (
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr><th>Time</th><th>Medicine</th><th>Type</th><th>Qty</th><th>Note</th></tr>
              </thead>
              <tbody>
                {dailyRows.map((row, index) => (
                  <tr key={`${row.time}-${row.medicine}-${index}`}>
                    <td>{row.time}</td>
                    <td>{row.medicine}</td>
                    <td className="capitalize">{row.type}</td>
                    <td>{row.quantity}</td>
                    <td>{row.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-muted">In-date purchase value</p><p className="mt-1 text-2xl font-semibold">{formatPkr(summary.purchaseValue)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">In-date sale value</p><p className="mt-1 text-2xl font-semibold">{formatPkr(summary.saleValue)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Available units</p><p className="mt-1 text-2xl font-semibold">{summary.availableUnits}</p></Card>
      </div>
      <Card>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Medicine</th><th>Generic</th><th>Qty</th><th>Sale price</th><th>Supplier</th></tr>
            </thead>
            <tbody>
              {medicines.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.genericName}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPkr(item.salePrice)}</td>
                  <td>{item.supplierName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
