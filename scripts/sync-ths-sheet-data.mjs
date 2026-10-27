import path from "node:path";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import XLSX from "xlsx";

const workbookPath = process.argv[2];
if (!workbookPath) throw new Error("Pass the Medicine_Inventory.xlsx file path.");
const quantityMode = process.argv[3] || "b2-current";
const importerVersion = "2";
if (quantityMode !== "sum" && quantityMode !== "b2-current") {
  throw new Error("Quantity mode must be 'sum' or 'b2-current'.");
}

const root = process.cwd();
const outPath = path.join(root, "lib", "ths-medicine-sheet-data.ts");
const workbookBytes = await readFile(workbookPath);
const sourceVersion = createHash("sha256")
  .update("importer-version=" + importerVersion + "\nquantity-mode=" + quantityMode + "\n")
  .update(workbookBytes)
  .digest("hex")
  .slice(0, 16);
const workbook = XLSX.read(workbookBytes, { type: "buffer", cellDates: true });
const sheetName = workbook.SheetNames.find((name) => name.toLowerCase() === "medicine inventory");
if (!sheetName) throw new Error("Workbook is missing the 'Medicine Inventory' sheet.");
const worksheet = workbook.Sheets[sheetName];
const sourceRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true });
const [header, ...rows] = sourceRows;

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function findColumn(expected) {
  const index = header.findIndex((value) => normalizeHeader(value) === normalizeHeader(expected));
  if (index < 0) throw new Error("Workbook is missing the '" + expected + "' column.");
  return index;
}
const nameIndex = findColumn("Medicine Name");
const typeIndex = findColumn("Type");
const expiryIndex = findColumn("Expiry (MM-YYYY)");
const b1QuantityIndex = findColumn("Quantity B-1");
const b2QuantityIndex = findColumn("Quantity B-2");

function normalizeType(raw, name) {
  const value = String(raw ?? "").trim();
  if (value) {
    const knownTypes = {
      tablet: "Tablet",
      capsule: "Capsule",
      syrup: "Syrup",
      ointment: "Ointment",
      gel: "Gel",
      cream: "Cream",
      balm: "Balm",
      injection: "Injection",
      lotion: "Lotion",
      "medical item": "Medical Item",
      drops: "Drops",
      pkt: "Pkt",
      tape: "Tape",
    };
    return knownTypes[value.toLowerCase()] || value[0].toUpperCase() + value.slice(1);
  }
  const inferred = String(name).match(/(syrup|injection|lotion|cream|gel|ointment|capsule|tablet|drops|tape|balm)$/i);
  return inferred ? inferred[1][0].toUpperCase() + inferred[1].slice(1).toLowerCase() : "Tablet";
}
function normalizeName(raw, itemType) {
  const name = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (/^pcm$/i.test(name) && itemType === "Syrup") return "PCM Syrup";
  if (/^flagyl$/i.test(name) && itemType === "Syrup") return "Flagyl Syrup";
  if (/^dicloran$/i.test(name) && itemType === "Gel") return "Dicloran Gel";
  if (/^nitto$/i.test(name) && itemType === "Tape") return "Nitto Tape";
  return name;
}
function normalizeKey(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}
function numericQuantity(value) {
  if (value === null || value === undefined || value === "") return null;
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) throw new Error("Invalid stock quantity: " + String(value));
  return Math.max(0, Math.floor(quantity));
}
function quantityValue(b1Raw, b2Raw) {
  const b1 = numericQuantity(b1Raw);
  const b2 = numericQuantity(b2Raw);
  if (quantityMode === "sum") {
    if (b1 === null && b2 === null) return null;
    return (b1 ?? 0) + (b2 ?? 0);
  }
  return b2 ?? b1;
}
function expiryValue(value, rowNumber) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  let year;
  let month;
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    year = value.getFullYear();
    month = value.getMonth() + 1;
  } else if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      year = parsed.y;
      month = parsed.m;
    }
  }
  if (year === undefined) {
    const text = String(value).trim();
    const monthYear = text.match(/^(\d{1,2})[-/.](\d{4})$/);
    if (monthYear) {
      month = Number(monthYear[1]);
      year = Number(monthYear[2]);
    } else {
      const parsed = new Date(text);
      if (Number.isFinite(parsed.getTime())) {
        year = parsed.getFullYear();
        month = parsed.getMonth() + 1;
      }
    }
  }
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid expiry date at spreadsheet row " + rowNumber + ": " + String(value));
  }
  const lastDay = new Date(year, month, 0).getDate();
  return String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0") + "-" + String(lastDay).padStart(2, "0");
}

const oldSource = await readFile(outPath, "utf8").catch(() => "");
const previousMinimumByName = new Map();
const previousRowPattern = /^\s*\{ name: ("(?:[^"\\]|\\.)*"), itemType: ("(?:[^"\\]|\\.)*"), minimumStock: (null|\d+), currentQuantity:/gm;
for (const match of oldSource.matchAll(previousRowPattern)) {
  const name = JSON.parse(match[1]);
  const minimum = match[3] === "null" ? null : Number(match[3]);
  previousMinimumByName.set(normalizeKey(name), minimum);
}

const seen = new Set();
const medicines = [];
for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  if (!row[nameIndex]) continue;
  const itemType = normalizeType(row[typeIndex], row[nameIndex]);
  const name = normalizeName(row[nameIndex], itemType);
  const key = normalizeKey(name);
  if (seen.has(key)) continue;
  seen.add(key);
  medicines.push({
    name,
    itemType,
    minimumStock: previousMinimumByName.get(key) ?? null,
    currentQuantity: quantityValue(row[b1QuantityIndex], row[b2QuantityIndex]),
    expiryDate: expiryValue(row[expiryIndex], index + 2),
  });
}
if (medicines.length === 0) throw new Error("No medicine rows were found in the workbook.");

const body = medicines.map((item) =>
  "  { name: " + JSON.stringify(item.name) +
  ", itemType: " + JSON.stringify(item.itemType) +
  ", minimumStock: " + (item.minimumStock ?? "null") +
  ", currentQuantity: " + (item.currentQuantity ?? "null") +
  ", expiryDate: " + JSON.stringify(item.expiryDate) + " },",
).join("\n");
const expiryCount = medicines.filter((item) => item.expiryDate).length;
const output = [
  "/**",
  " * THS Medical Center inventory imported from Medicine_Inventory.xlsx.",
  " * Quantity mode: " + quantityMode + " · medicines: " + medicines.length + " · expiry dates: " + expiryCount,
  " */",
  "export type ThsSheetMedicineRow = {",
  "  name: string;",
  "  itemType: string;",
  "  minimumStock: number | null;",
  "  currentQuantity: number | null;",
  "  expiryDate: string;",
  "};",
  "",
  "export const THS_SHEET_SOURCE_VERSION = " + JSON.stringify(sourceVersion) + ";",
  "",
  "export const THS_SHEET_MEDICINES: ThsSheetMedicineRow[] = [",
  body,
  "];",
  "",
].join("\n");
await writeFile(outPath, output, "utf8");
console.log("Wrote " + medicines.length + " medicines (" + expiryCount + " expiry dates, " + quantityMode + " quantities) to " + outPath);
console.log("Source version: " + sourceVersion);
