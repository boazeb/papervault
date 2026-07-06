// Builds the PaperVault single-file executable for the CURRENT OS via Node SEA.
// Prereq: `npm run build` (produces build/). Output: dist/papervault[.exe].
// In CI this runs once per OS in a matrix so each platform gets a native binary.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const OUT_DIR = 'dist';
const BIN = join(OUT_DIR, isWin ? 'papervault.exe' : 'papervault');
// Node's fixed SEA sentinel fuse (see nodejs.org/api/single-executable-applications).
const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

const sh = (cmd) => { console.log(`$ ${cmd}`); execSync(cmd, { stdio: 'inherit' }); };

// 1. embed the production build into build-sea/app.pack
sh('node scripts/pack-build.mjs');
// 2. generate the SEA preparation blob
sh('node --experimental-sea-config sea-config.json');
// 3. start from a copy of the running Node binary
mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(process.execPath, BIN);
if (!isWin) chmodSync(BIN, 0o755);
// 4. macOS binaries must have their signature removed before injection
if (isMac) sh(`codesign --remove-signature "${BIN}"`);
// 5. inject the blob
let inject = `npx --yes postject "${BIN}" NODE_SEA_BLOB build-sea/sea-prep.blob --sentinel-fuse ${FUSE}`;
if (isMac) inject += ' --macho-segment-name NODE_SEA';
sh(inject);
// 6. macOS: ad-hoc re-sign so it runs locally (proper Developer ID notarization is a follow-up)
if (isMac) sh(`codesign --sign - "${BIN}"`);

console.log(`\n✓ Built ${BIN}`);
if (isMac || isWin) {
  console.log('  Note: unsigned — the OS shows an "unidentified developer" prompt until we add notarization.');
}
