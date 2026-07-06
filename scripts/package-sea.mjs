// Packages the single-file executable (dist/papervault[.exe], from build-sea.mjs)
// into an OS-native distributable that people can actually double-click:
//
//   macOS   → dist/PaperVault-macos-arm64.zip   a real PaperVault.app (icon,
//             double-click, "Quit" dialog). Browsers strip the execute bit and
//             a bare binary shows as a dead "?" document — a .app fixes both.
//   Linux   → dist/papervault-linux-x64.tar.gz  tar preserves the +x bit that a
//             browser download would otherwise drop.
//   Windows → dist/papervault-windows-x64.exe   already double-clickable; just
//             gets its release name.
//
// The chosen artifact's repo-relative path is written to dist/artifact-path.txt
// (forward slashes) so the release workflow can attest + upload it.
//
// PV_VERSION (env) stamps the macOS bundle version; defaults to 0.0.0 locally.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, chmodSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const VERSION = process.env.PV_VERSION || '0.0.0';
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';

const sh = (cmd, quiet = false) => {
  if (!quiet) console.log('$ ' + cmd);
  execSync(cmd, { stdio: quiet ? 'ignore' : 'inherit' });
};

function packageMac() {
  const bin = join(DIST, 'papervault');
  if (!existsSync(bin)) throw new Error('dist/papervault not found — run `node scripts/build-sea.mjs` first');

  const APP = join(DIST, 'PaperVault.app');
  const macos = join(APP, 'Contents', 'MacOS');
  const resources = join(APP, 'Contents', 'Resources');
  rmSync(APP, { recursive: true, force: true });
  mkdirSync(macos, { recursive: true });
  mkdirSync(resources, { recursive: true });

  // 1. the real server binary lives in Resources (case-insensitive FS can't hold
  //    both "PaperVault" the launcher and "papervault" the binary in one dir).
  copyFileSync(bin, join(resources, 'papervault'));
  chmodSync(join(resources, 'papervault'), 0o755);

  // 2. launcher script is the bundle's main executable.
  copyFileSync(join(HERE, 'mac-app', 'launcher.sh'), join(macos, 'PaperVault'));
  chmodSync(join(macos, 'PaperVault'), 0o755);

  // 3. version-stamped Info.plist.
  const plist = readFileSync(join(HERE, 'mac-app', 'Info.plist'), 'utf8').replaceAll('__VERSION__', VERSION);
  writeFileSync(join(APP, 'Contents', 'Info.plist'), plist);

  // 4. icon (+ a copy the Quit dialog can display), generated from the app logo.
  const logo = join(ROOT, 'public', 'papervault-512.png');
  if (existsSync(logo)) {
    copyFileSync(logo, join(resources, 'icon.png'));
    const iconset = join(DIST, 'PaperVault.iconset');
    rmSync(iconset, { recursive: true, force: true });
    mkdirSync(iconset, { recursive: true });
    const variants = [
      [16, '16x16'], [32, '16x16@2x'], [32, '32x32'], [64, '32x32@2x'],
      [128, '128x128'], [256, '128x128@2x'], [256, '256x256'], [512, '256x256@2x'],
      [512, '512x512'], [1024, '512x512@2x'],
    ];
    for (const [px, name] of variants) {
      sh(`sips -z ${px} ${px} "${logo}" --out "${join(iconset, `icon_${name}.png`)}"`, true);
    }
    sh(`iconutil -c icns "${iconset}" -o "${join(resources, 'PaperVault.icns')}"`);
    rmSync(iconset, { recursive: true, force: true });
  } else {
    console.warn('  (no public/papervault-512.png — bundle ships without a custom icon)');
  }

  // 5. ad-hoc sign the bundle (Developer ID notarization is the follow-up).
  sh(`codesign --force --deep --sign - "${APP}"`);

  // 6. zip with ditto (preserves the bundle structure for macOS).
  const zip = join(DIST, 'PaperVault-macos-arm64.zip');
  rmSync(zip, { force: true });
  sh(`ditto -c -k --keepParent "${APP}" "${zip}"`);
  return 'dist/PaperVault-macos-arm64.zip';
}

function packageLinux() {
  const bin = join(DIST, 'papervault');
  if (!existsSync(bin)) throw new Error('dist/papervault not found — run `node scripts/build-sea.mjs` first');
  chmodSync(bin, 0o755);
  sh(`tar -czf "${join(DIST, 'papervault-linux-x64.tar.gz')}" -C "${DIST}" papervault`);
  return 'dist/papervault-linux-x64.tar.gz';
}

function packageWindows() {
  const exe = join(DIST, 'papervault.exe');
  if (!existsSync(exe)) throw new Error('dist/papervault.exe not found — run `node scripts/build-sea.mjs` first');
  copyFileSync(exe, join(DIST, 'papervault-windows-x64.exe'));
  return 'dist/papervault-windows-x64.exe';
}

const artifact = isMac ? packageMac() : isWin ? packageWindows() : packageLinux();
writeFileSync(join(DIST, 'artifact-path.txt'), artifact);
console.log(`\n✓ packaged → ${artifact}`);
