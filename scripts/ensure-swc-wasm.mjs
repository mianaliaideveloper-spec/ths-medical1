import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
/** SWC .wasm under OneDrive is often blocked or fails to load; use LocalAppData instead. */
export function ensureSwcWasmDir() {
  const cacheRoot =
    process.env.THS_SWC_WASM_DIR ??
    path.join(process.env.LOCALAPPDATA ?? osTempFallback(), "ths-medical-swc");

  let pkgDir;
  try {
    pkgDir = path.dirname(require.resolve("@next/swc-wasm-nodejs/package.json"));
  } catch {
    console.warn(
      "[ths-medical] @next/swc-wasm-nodejs is missing. Run: npm install",
    );
    return null;
  }

  fs.mkdirSync(cacheRoot, { recursive: true });

  for (const name of ["wasm.js", "wasm_bg.wasm"]) {
    const src = path.join(pkgDir, name);
    const dest = path.join(cacheRoot, name);
    if (!fs.existsSync(src)) continue;
    const needsCopy =
      !fs.existsSync(dest) ||
      fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs;
    if (needsCopy) {
      fs.copyFileSync(src, dest);
    }
  }

  return cacheRoot;
}

function osTempFallback() {
  return process.env.TEMP ?? process.env.TMP ?? "C:\\Temp";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dir = ensureSwcWasmDir();
  if (dir) process.stdout.write(dir);
}
