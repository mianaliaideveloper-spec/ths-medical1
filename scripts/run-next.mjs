import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSwcWasmDir } from "./ensure-swc-wasm.mjs";

const wasmDir = ensureSwcWasmDir();
if (wasmDir) {
  process.env.NEXT_TEST_WASM_DIR = wasmDir;
}

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
