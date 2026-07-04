#!/usr/bin/env node
/*
 * Keeps public/wasm/zxing_reader.wasm in sync with the installed zxing-wasm.
 *
 * The QR scanner (src/index.js -> setZXingModuleOverrides) loads the WASM
 * decoder from same-origin `/wasm/` instead of a CDN, so scanning works offline
 * / air-gapped and inside the `connect-src 'self'` CSP. The catch: the .wasm
 * binary is version-paired with the zxing-wasm JS glue. If a dependency bump
 * moves zxing-wasm but the committed binary stays put, the module fails to
 * instantiate and scanning breaks (this is exactly what a lockfile float did).
 *
 * Running this before `npm start` / `npm run build` re-copies the binary from
 * node_modules, so public/wasm/ is always matched to what's actually installed.
 * Fails loudly (exit 1) if the binary can't be found, so a broken build is
 * visible rather than shipping a stale decoder.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'wasm');
const WASM_NAME = 'zxing_reader.wasm';

// zxing-wasm may be hoisted to top-level or nested under barcode-detector.
function findWasm(dir, depth) {
  if (depth > 8) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (e.isFile() && e.name === WASM_NAME) return path.join(dir, e.name);
  }
  for (const e of entries) {
    if (e.isDirectory() && e.name !== '.bin') {
      const found = findWasm(path.join(dir, e.name), depth + 1);
      if (found) return found;
    }
  }
  return null;
}

let src = null;
for (const root of ['barcode-detector', 'zxing-wasm']) {
  src = findWasm(path.join(ROOT, 'node_modules', root), 0);
  if (src) break;
}

if (!src) {
  console.error(
    `[copy-wasm] ERROR: ${WASM_NAME} not found under node_modules. Run \`npm install\` first.`
  );
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const dest = path.join(OUT_DIR, WASM_NAME);
const srcBuf = fs.readFileSync(src);
const inSync = fs.existsSync(dest) && fs.readFileSync(dest).equals(srcBuf);

if (inSync) {
  console.log(`[copy-wasm] public/wasm/${WASM_NAME} already in sync`);
} else {
  fs.writeFileSync(dest, srcBuf);
  console.log(`[copy-wasm] updated public/wasm/${WASM_NAME} from ${path.relative(ROOT, src)}`);
}
