// Ephemeral localhost print server.
// Serves the selector page + each kit page from memory. Binds to 127.0.0.1
// on a random port. Shuts down on POST /__shutdown or after an idle timeout.

import { createServer } from 'node:http';
import { generateSelectorPage } from '@papervault/core';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes — server self-destructs if user wanders off.

/**
 * @param {import('@papervault/core').Kit} kit
 * @returns {Promise<{url: string, done: Promise<void>}>}
 */
export function servePrintKit(kit) {
    // Build the in-memory route map. Each page gets a path like /pages/0, /pages/1...
    const routes = new Map();
    const pageList = kit.pages.map((p, i) => ({
        kind: p.kind,
        path: `/pages/${i}`,
        label: p.label,
        seq: p.seq,
        alias: p.alias,
        custodian: p.custodian,
    }));
    kit.pages.forEach((p, i) => routes.set(`/pages/${i}`, p));

    // The whole-kit printable doc lives at /print-all and is auto-printed.
    let printAllHtml = kit.printAllHtml;

    const selectorHtml = generateSelectorPage({
        vaultName: kit.vaultName,
        vaultId: kit.vaultId,
        threshold: kit.threshold,
        shares: kit.shares,
        pages: pageList,
        printAllPath: '/print-all',
    });

    let resolveDone;
    const done = new Promise(resolve => { resolveDone = resolve; });

    const server = createServer((req, res) => {
        // Block any non-localhost requests defensively.
        const remote = req.socket.remoteAddress;
        if (remote !== '127.0.0.1' && remote !== '::1' && remote !== '::ffff:127.0.0.1') {
            res.writeHead(403); res.end(); return;
        }

        // CSP: deny everything except inline (we control all the HTML).
        // No external network, no scripts from elsewhere, no images outside data: URIs.
        res.setHeader('Content-Security-Policy',
            "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
            "script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'");
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Cache-Control', 'no-store');

        const url = new URL(req.url, 'http://127.0.0.1');
        const path = url.pathname;

        if (req.method === 'POST' && path === '/__shutdown') {
            res.writeHead(204); res.end();
            shutdown();
            return;
        }
        if (req.method !== 'GET') {
            res.writeHead(405); res.end(); return;
        }

        if (path === '/' || path === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(selectorHtml);
            return;
        }

        if (path === '/print-all') {
            if (!printAllHtml) {
                res.writeHead(410); res.end('Kit cleared'); return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(printAllHtml);
            return;
        }

        const page = routes.get(path);
        if (page) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(page.html);
            return;
        }

        res.writeHead(404); res.end('Not found');
    });

    function shutdown() {
        // Drop every in-memory reference we hold so the JS engine can GC the
        // kit data. We can't truly zeroize strings in V8 (they're immutable
        // and may live in internal tables until GC runs), but we can at least
        // make sure nothing in our object graph still points at them.
        routes.clear();
        if (Array.isArray(kit.pages)) kit.pages.length = 0;
        if (Array.isArray(kit.keyShares)) kit.keyShares.length = 0;
        kit.cipherKeyHex = '';
        kit.cipherTextHex = '';
        kit.cipherIvHex = '';
        printAllHtml = null;
        // Allow currently-open connections to drain briefly.
        setTimeout(() => {
            server.close(() => resolveDone());
        }, 100);
    }

    const idleTimer = setTimeout(() => {
        process.stderr.write('Idle timeout — clearing kit and shutting down server.\n');
        shutdown();
    }, IDLE_TIMEOUT_MS);
    // Don't keep the event loop alive solely for the timer.
    idleTimer.unref?.();

    return new Promise(resolve => {
        // Bind to 127.0.0.1 only.
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            const url = `http://127.0.0.1:${addr.port}/`;
            resolve({ url, done });
        });
    });
}
