import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const csvPath = path.join(os.tmpdir(), "ths-med.csv");
const outPath = path.resolve("lib/ths-medicine-sheet-data.ts");

function normType(raw) {
  const t = (raw || "").trim();
  const map = { gel: "Gel", syrup: "Syrup", pkt: "Pkt", tape: "Tape", drops: "Drops" };
  const key = t.toLowerCase();
  if (map[key]) return map[key];
  if (!t) return "Tablet";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function normName(name, itemType) {
  let n = (name || "").trim().replace(/\s+/g, " ");
  if (/^pcm$/i.test(n) && itemType === "Syrup") return "PCM Syrup";
  if (/^flagyl$/i.test(n) && itemType === "Syrup") return "Flagyl Syrup";
  if (/^dicloran$/i.test(n) && itemType === "Gel") return "Dicloran Gel";
  if (/^nitto$/i.test(n) && itemType === "Tape") return "Nitto Tape";
  return n;
}

const text = fs.readFileSync(csvPath, "utf8");
const lines = text.split(/\r?\n/).slice(2).filter(Boolean);
const seen = new Set();
const rows = [];

for (const line of lines) {
  const parts = line.split(",");
  const sr = parts[0];
  if (!/^\d+$/.test(sr)) continue;
  const itemType = normType(parts[2]);
  const name = normName(parts[1], itemType);
  const key = name.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push({ name, itemType });
}

const body = rows
  .map((r) => `  { name: ${JSON.stringify(r.name)}, itemType: ${JSON.stringify(r.itemType)} },`)
  .join("\n");

const out = `/**
 * THS Medical Center final medicine list (clinic spreadsheet).
 * Source: https://docs.google.com/spreadsheets/d/1E5alXvmfh8dGeuI7yGWDzN7mwOaFC6DS
 * Regenerate: download CSV to %TEMP%\\ths-med.csv then \`node scripts/sync-ths-sheet-data.mjs\`
 * Items: ${rows.length}
 */
export type ThsSheetMedicineRow = {
  name: string;
  itemType: string;
};

export const THS_SHEET_MEDICINES: ThsSheetMedicineRow[] = [
${body}
];
`;

fs.writeFileSync(outPath, out);
console.log(`Wrote ${rows.length} medicines to ${outPath}`);
