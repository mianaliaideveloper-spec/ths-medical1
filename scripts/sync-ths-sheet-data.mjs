import path from "node:path";
import { writeFile } from "node:fs/promises";
import XLSX from "xlsx";

const workbookPath = process.argv[2];
if (!workbookPath) {
  throw new Error("Pass the downloaded THS Medical Center Medicine Database .xlsx file path.");
}
const outPath = path.resolve("lib/ths-medicine-sheet-data.ts");
const workbook = XLSX.readFile(workbookPath);

function sheetRows(name) {
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Workbook is missing the ${name} sheet.`);
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
}

function headerIndex(header, name) {
  return header.findIndex((value) => String(value ?? "").trim().toLowerCase() === name.toLowerCase());
}

function normType(raw) {
  const text = String(raw ?? "").trim();
  const known = { gel: "Gel", syrup: "Syrup", pkt: "Pkt", tape: "Tape", drops: "Drops" };
  return known[text.toLowerCase()] || (text ? text[0].toUpperCase() + text.slice(1) : "Tablet");
}

function normName(raw, itemType) {
  const name = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (/^pcm$/i.test(name) && itemType === "Syrup") return "PCM Syrup";
  if (/^flagyl$/i.test(name) && itemType === "Syrup") return "Flagyl Syrup";
  if (/^dicloran$/i.test(name) && itemType === "Gel") return "Dicloran Gel";
  if (/^nitto$/i.test(name) && itemType === "Tape") return "Nitto Tape";
  return name;
}

function dateValue(value) {
  if (!value) return "";
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return `${String(value.getFullYear()).padStart(4, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const text = String(value).trim();
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : text;
}

function keyedRows(name, medicineColumn, typeColumn, valueColumn) {
  const [header, ...rows] = sheetRows(name);
  const medicineIndex = headerIndex(header, medicineColumn);
  const typeIndex = headerIndex(header, typeColumn);
  const valueIndex = headerIndex(header, valueColumn);
  const output = new Map();
  for (const row of rows) {
    const medicineName = row[medicineIndex];
    if (!medicineName) continue;
    const type = normType(row[typeIndex]);
    output.set(normName(medicineName, type).toLowerCase(), row[valueIndex]);
  }
  return output;
}

const [masterHeader, ...masterRows] = sheetRows("Medicine Master");
const nameIndex = headerIndex(masterHeader, "Medicine / Item Name");
const typeIndex = headerIndex(masterHeader, "Type");
const minimumIndex = headerIndex(masterHeader, "Minimum Stock");
const expiryByName = keyedRows("Stock In", "Medicine Name", "Type", "Expiry Date");
const quantityByName = keyedRows("Current Stock", "Medicine Name", "Type", "Current Balance");
const seen = new Set();
const rows = [];

for (const row of masterRows) {
  if (!row[nameIndex]) continue;
  const itemType = normType(row[typeIndex]);
  const name = normName(row[nameIndex], itemType);
  const key = name.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  const minimumValue = row[minimumIndex];
  const minimum = minimumValue === null || minimumValue === "" ? Number.NaN : Number(minimumValue);
  const quantityValue = quantityByName.get(key);
  const quantity = quantityValue === null || quantityValue === undefined || quantityValue === "" ? Number.NaN : Number(quantityValue);
  rows.push({
    name,
    itemType,
    minimumStock: Number.isFinite(minimum) ? Math.max(0, Math.floor(minimum)) : null,
    currentQuantity: Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : null,
    expiryDate: dateValue(expiryByName.get(key)),
  });
}

const body = rows.map((row) =>
  `  { name: ${JSON.stringify(row.name)}, itemType: ${JSON.stringify(row.itemType)}, minimumStock: ${row.minimumStock ?? "null"}, currentQuantity: ${row.currentQuantity}, expiryDate: ${JSON.stringify(row.expiryDate)} },`,
).join("\n");
const dateCount = rows.filter((row) => row.expiryDate).length;
const out = `/**
 * THS Medical Center inventory catalog imported from its shared Google workbook.
 * Source: https://docs.google.com/spreadsheets/d/1lTdoDTwg7DhF6VHFY_KBHFPHqxjz2OO9/edit
 * Master items: ${rows.length} · expiry dates supplied: ${dateCount}
 */
export type ThsSheetMedicineRow = {
  name: string;
  itemType: string;
  minimumStock: number | null;
  currentQuantity: number | null;
  expiryDate: string;
};

export const THS_SHEET_MEDICINES: ThsSheetMedicineRow[] = [
${body}
];
`;

await writeFile(outPath, out, "utf8");
console.log(`Wrote ${rows.length} unique medicines (${dateCount} with expiry dates) to ${outPath}`);
