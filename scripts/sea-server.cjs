'use strict';
/*
 * PaperVault single-executable entrypoint (Node SEA main script).
 *
 * Serves the embedded production build over http://127.0.0.1 and opens the
 * browser. It must be a local server rather than opening the HTML directly,
 * because the QR-scanner WASM, camera (getUserMedia) and Web Crypto all require
 * a "secure context" — localhost qualifies, file:// does not.
 *
 * The whole `build/` output is embedded as a single `app.pack` SEA asset
 * (format produced by scripts/pack-build.mjs). Nothing is written to disk —
 * files are held in memory and served straight from there.
 */
const http = require('node:http');
const { spawn } = require('node:child_process');
const sea = require('node:sea');

// --- load the embedded bundle (or a local app.pack when run outside the SEA, for dev) ---
function loadPack() {
  if (sea.isSea && sea.isSea()) return Buffer.from(sea.getRawAsset('app.pack'));
  // dev fallback: `node scripts/sea-server.cjs` after `node scripts/pack-build.mjs`
  const fs = require('node:fs');
  const path = require('node:path');
  return fs.readFileSync(path.join(__dirname, '..', 'build-sea', 'app.pack'));
}

// format: repeated [uint32 pathLen][path utf8][uint32 contentLen][content bytes]
function unpack(buf) {
  const files = new Map();
  let off = 0;
  while (off + 4 <= buf.length) {
    const pathLen = buf.readUInt32LE(off); off += 4;
    const p = buf.toString('utf8', off, off + pathLen); off += pathLen;
    const size = buf.readUInt32LE(off); off += 4;
    files.set(p, buf.subarray(off, off + size)); off += size;
  }
  return files;
}

const FILES = unpack(loadPack());

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};
const extOf = (p) => { const i = p.lastIndexOf('.'); return i < 0 ? '' : p.slice(i).toLowerCase(); };

const server = http.createServer((req, res) => {
  let pathname = '/index.html';
  try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); } catch { /* keep default */ }
  if (pathname === '/' || pathname.endsWith('/')) pathname = '/index.html';

  let servedPath = pathname;
  let body = FILES.get(pathname);
  if (!body) { servedPath = '/index.html'; body = FILES.get(servedPath); } // SPA fallback (client-side routing)
  if (!body) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }

  res.writeHead(200, {
    'Content-Type': MIME[extOf(servedPath)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(body);
});

function openBrowser(url) {
  try {
    if (process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    else if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    else spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
  } catch { /* user can open it manually */ }
}

server.listen(0, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  process.stdout.write(`\n  PaperVault is running — open it at:\n\n    ${url}\n\n  Keep this window open while you use it. Press Ctrl+C to stop.\n\n`);
  openBrowser(url);
});
