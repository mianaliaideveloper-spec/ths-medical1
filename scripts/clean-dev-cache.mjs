import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(projectRoot, ".next");
const legacyDir = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "ths-medical-next")
  : null;

for (const target of [nextDir, legacyDir].filter(Boolean)) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Removed ${target}`);
  } catch (err) {
    console.warn(`Could not remove ${target}:`, err instanceof Error ? err.message : err);
  }
}
