import { formatDate, formatPkr } from "@/lib/format";
import {
  resolveDoseTablets,
  resolveTabletsPerStrip,
  medicineUsesStrip,
  type StripSale,
} from "@/lib/pack";
import { PRINT_FEE_PER_DAY_PKR, STORE_LABEL, STORE_LEGAL_NAME, STORE_TAGLINE } from "@/lib/branding";
import type { BillCartRow, MedicinePrintInput } from "@/lib/bill";
import { billGrandTotal, buildBillLine, normalizeSupplyDays, printFeeForDays } from "@/lib/bill";
import type { Medicine, ReceptionVisit, StockMovement } from "@/lib/types";
import { RECEPTION_SLIP_FEE_PKR } from "@/lib/reception";

export type { MedicinePrintInput } from "@/lib/bill";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function printStyles() {
  return `
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #111;
      width: 72mm;
      font-size: 11px;
      line-height: 1.35;
    }
    .center { text-align: center; }
    .title { font-size: 13px; font-weight: 700; }
    .muted { color: #555; font-size: 10px; }
    .line { border-top: 1px dashed #999; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 4px 0; vertical-align: top; text-align: left; }
    th { font-size: 9px; text-transform: uppercase; color: #666; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .token {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.02em;
      margin: 6px 0 2px;
    }
  `;
}

function buildPrintHtml(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${printStyles()}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

function writePrintWindow(win: Window, html: string) {
  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();
}

function runPrintDialog(win: Window) {
  try {
    win.focus();
    win.print();
  } catch {
    window.alert("Print dialog did not open. Choose your printer in the slip window, then try again.");
  }
}

/** Visible slip window so Windows / Print to PDF can show content (hidden iframe breaks preview). */
export function openPrintDocument(title: string, bodyHtml: string) {
  const html = buildPrintHtml(title, bodyHtml);

  const popup = window.open(
    "",
    "ths-print",
    "popup=yes,width=400,height=720,menubar=no,toolbar=no,location=no,status=no",
  );

  if (popup && !popup.closed) {
    writePrintWindow(popup, html);
    const schedulePrint = () => setTimeout(() => runPrintDialog(popup), 400);
    popup.onload = schedulePrint;
    if (popup.document.readyState === "complete") schedulePrint();
    popup.onafterprint = () => {
      try {
        popup.close();
      } catch {
        /* ignore */
      }
    };
    return;
  }

  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Print preview");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;";

  const panel = document.createElement("div");
  panel.style.cssText =
    "background:#fff;border-radius:12px;max-width:420px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.2);";

  const bar = document.createElement("div");
  bar.style.cssText =
    "display:flex;gap:8px;justify-content:flex-end;padding:12px 12px 0;flex-shrink:0;";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Close";
  closeBtn.style.cssText =
    "padding:8px 14px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer;font-size:14px;";

  const printBtn = document.createElement("button");
  printBtn.type = "button";
  printBtn.textContent = "Print";
  printBtn.style.cssText =
    "padding:8px 14px;border:none;border-radius:8px;background:#156b47;color:#fff;cursor:pointer;font-size:14px;font-weight:600;";

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  iframe.style.cssText = "border:0;width:100%;flex:1;min-height:420px;background:#fff;";

  const dismiss = () => overlay.remove();

  closeBtn.onclick = dismiss;
  printBtn.onclick = () => {
    const win = iframe.contentWindow;
    if (win) runPrintDialog(win);
  };
  overlay.onclick = (event) => {
    if (event.target === overlay) dismiss();
  };

  bar.append(closeBtn, printBtn);
  panel.append(bar, iframe);
  overlay.append(panel);
  document.body.appendChild(overlay);

  const win = iframe.contentWindow;
  if (!win) {
    dismiss();
    window.alert("Could not open print preview. Allow pop-ups for this site and try again.");
    return;
  }
  writePrintWindow(win, html);
  iframe.onload = () => setTimeout(() => runPrintDialog(win), 400);
}

function headerBlock(subtitle: string) {
  const now = new Date().toLocaleString("en-PK", { hour12: true });
  return `
    <div class="center">
      <div class="title">${escapeHtml(STORE_LEGAL_NAME)}</div>
      <div class="muted">${escapeHtml(STORE_LABEL)} · ${escapeHtml(STORE_TAGLINE)}</div>
      <div class="muted">${escapeHtml(subtitle)}</div>
      <div class="muted">${escapeHtml(now)}</div>
    </div>
    <div class="line"></div>
  `;
}

function resolvePrintQuantities(medicine: Medicine, input?: MedicinePrintInput) {
  if (medicineUsesStrip(medicine)) {
    const perStrip =
      input?.mode === "tablets" && input.tabletsPerStrip
        ? input.tabletsPerStrip
        : resolveTabletsPerStrip(medicine);
    const tabletQuantity =
      input?.mode === "tablets" ? Math.max(1, Math.floor(input.tabletQuantity)) : perStrip;
    const stripCount = Math.max(1, Math.ceil(tabletQuantity / perStrip));
    const dose =
      input?.mode === "tablets" && input.doseTablets !== undefined
        ? input.doseTablets
        : resolveDoseTablets(medicine);
    const pack: StripSale = {
      stripCount,
      tabletsPerStrip: perStrip,
      totalTablets: tabletQuantity,
      doseTablets: dose,
    };
    return { kind: "strip" as const, pack, billQty: tabletQuantity };
  }
  const unitQty = input?.mode === "unit" ? input.unitQty : 1;
  return { kind: "unit" as const, unitQty: Math.max(1, unitQty), billQty: Math.max(1, unitQty) };
}

function stripRows(pack: StripSale, doseFromMedicine: number) {
  const dose = pack.doseTablets || doseFromMedicine;
  const doseRow =
    dose > 0
      ? `<tr><th>Dose</th><td class="right">${dose} tablet each time</td></tr>`
      : "";
  return `
    <tr><th>Strips</th><td class="right">${pack.stripCount}</td></tr>
    <tr><th>Tablets / strip</th><td class="right">${pack.tabletsPerStrip}</td></tr>
    <tr><th>Tablet qty</th><td class="right bold">${pack.totalTablets}</td></tr>
    ${doseRow}
  `;
}

function lineItemHtml(medicine: Medicine, input: MedicinePrintInput) {
  const line = buildBillLine(medicine, input);
  const resolved = resolvePrintQuantities(medicine, input);
  const qtyDetail =
    resolved.kind === "strip"
      ? `${line.totalTablets} tab`
      : `${line.unitQty} ${line.unitLabel}`;
  return `
    <div class="line"></div>
    <p class="bold">${escapeHtml(line.medicineName)}</p>
    <p class="muted">${escapeHtml(line.genericName)} · ${escapeHtml(line.strength)}</p>
    <p class="muted">Exp ${escapeHtml(formatDate(medicine.expiryDate))} · ${escapeHtml(qtyDetail)} · Free</p>
  `;
}

export function printCustomerBill(rows: BillCartRow[], supplyDays = 1) {
  if (rows.length === 0) return;
  const days = normalizeSupplyDays(supplyDays);
  const grand = billGrandTotal(rows, days);
  const items = rows
    .map((row) => {
      const input: MedicinePrintInput = medicineUsesStrip(row.medicine)
        ? {
            mode: "tablets",
            tabletQuantity: row.line.totalTablets,
            tabletsPerStrip: row.line.tabletsPerStrip || undefined,
            doseTablets: row.line.doseTablets,
          }
        : { mode: "unit", unitQty: row.line.unitQty };
      return lineItemHtml(row.medicine, input);
    })
    .join("");

  const html = `
    ${headerBlock("Customer bill")}
    ${items}
    <div class="line"></div>
    <table>
      <tr><th>Items</th><td class="right">${rows.length}</td></tr>
      <tr><th>Medicine</th><td class="right">Free</td></tr>
      <tr><th>Days</th><td class="right">${days}</td></tr>
      <tr><th>Fee / day</th><td class="right">${escapeHtml(formatPkr(PRINT_FEE_PER_DAY_PKR))}</td></tr>
      <tr><th>Dispensing fee</th><td class="right">${escapeHtml(formatPkr(grand))}</td></tr>
      <tr><th>Grand total</th><td class="right bold">${escapeHtml(formatPkr(grand))}</td></tr>
    </table>
    <div class="line"></div>
    <p class="center muted">Thank you</p>
  `;
  openPrintDocument("Customer bill", html);
}

export function printMedicine(medicine: Medicine, input?: MedicinePrintInput, supplyDays = 1) {
  const days = normalizeSupplyDays(supplyDays);
  const fee = printFeeForDays(days);
  const resolved = resolvePrintQuantities(medicine, input);
  const qtySection =
    resolved.kind === "strip"
      ? stripRows(resolved.pack, resolveDoseTablets(medicine))
      : `<tr><th>Qty</th><td class="right">${resolved.unitQty} ${escapeHtml(medicine.unit)}</td></tr>`;

  const html = `
    ${headerBlock("Medicine slip")}
    <p class="bold">${escapeHtml(medicine.name)}</p>
    <p class="muted">${escapeHtml(medicine.genericName)} · ${escapeHtml(medicine.strength)}</p>
    <div class="line"></div>
    <table>
      ${medicine.manufacturingDate ? `<tr><th>Mfg date</th><td class="right">${escapeHtml(formatDate(medicine.manufacturingDate))}</td></tr>` : ""}
      <tr><th>Expiry</th><td class="right">${escapeHtml(formatDate(medicine.expiryDate))}</td></tr>
      ${qtySection}
      <tr><th>Medicine</th><td class="right">Free</td></tr>
      <tr><th>Days</th><td class="right">${days}</td></tr>
      <tr><th>Fee / day</th><td class="right">${escapeHtml(formatPkr(PRINT_FEE_PER_DAY_PKR))}</td></tr>
      <tr><th>Dispensing fee</th><td class="right">${escapeHtml(formatPkr(fee))}</td></tr>
      <tr><th>Total</th><td class="right bold">${escapeHtml(formatPkr(fee))}</td></tr>
      <tr><th>Supplier</th><td class="right">${escapeHtml(medicine.supplierName || "—")}</td></tr>
    </table>
    <div class="line"></div>
  `;
  openPrintDocument(`Print - ${medicine.name}`, html);
}

export function printMedicineList(medicines: Medicine[]) {
  const rows = medicines
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.genericName)}</td>
        <td class="right">${item.quantity}</td>
        <td class="right">${escapeHtml(formatPkr(item.salePrice))}</td>
      </tr>`,
    )
    .join("");

  const html = `
    ${headerBlock("Medicine list")}
    <table>
      <thead>
        <tr><th>Medicine</th><th>Generic</th><th class="right">Qty</th><th class="right">Sale</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="line"></div>
    <p class="muted">Total items: ${medicines.length}</p>
  `;
  openPrintDocument("Medicine list", html);
}

export function printReceptionSlip(visit: ReceptionVisit) {
  const html = `
    ${headerBlock("Reception slip · Doctor")}
    <p class="center muted">Token number (today)</p>
    <p class="center token">${visit.tokenNumber}</p>
    <p class="center muted">Slip ${escapeHtml(visit.slipNumber)}</p>
    <div class="line"></div>
    <table>
      <tr><th>Patient</th><td class="right bold">${escapeHtml(visit.patientName)}</td></tr>
      <tr><th>CNIC</th><td class="right">${escapeHtml(visit.cnic)}</td></tr>
      <tr><th>Age</th><td class="right">${visit.age} years</td></tr>
      ${visit.phone ? `<tr><th>Phone</th><td class="right">${escapeHtml(visit.phone)}</td></tr>` : ""}
      <tr><th>Complaint</th><td class="right">${escapeHtml(visit.complaint)}</td></tr>
    </table>
    <div class="line"></div>
    <table>
      <tr><th>Slip fee</th><td class="right bold">${escapeHtml(formatPkr(visit.slipFee || RECEPTION_SLIP_FEE_PKR))}</td></tr>
    </table>
    <div class="line"></div>
    <p class="center bold">Take this slip to the doctor</p>
    <p class="center muted">Medicine will be issued at the pharmacy after doctor approval</p>
    <p class="center muted">Thank you · ${escapeHtml(STORE_LABEL)}</p>
  `;
  openPrintDocument(`Reception ${visit.slipNumber}`, html);
}

export function printStockMovement(move: StockMovement, medicine: Medicine | undefined) {
  const html = `
    ${headerBlock("Stock movement")}
    <p class="bold">${escapeHtml(move.medicineName)}</p>
    ${medicine ? `<p class="muted">${escapeHtml(medicine.strength)}</p>` : ""}
    <div class="line"></div>
    <table>
      <tr><th>Type</th><td class="right">${escapeHtml(move.type)}</td></tr>
      <tr><th>Quantity</th><td class="right">${move.quantity}</td></tr>
      <tr><th>Balance after</th><td class="right">${move.balanceAfter}</td></tr>
      <tr><th>Note</th><td class="right">${escapeHtml(move.note || "—")}</td></tr>
      <tr><th>By</th><td class="right">${escapeHtml(move.createdBy)}</td></tr>
    </table>
  `;
  openPrintDocument(`Stock - ${move.medicineName}`, html);
}
