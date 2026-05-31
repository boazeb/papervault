import QRCode from 'qrcode';
import { SHARED_CSS, KEY_ASCII, DEFAULT_COLORS, esc, formatTime } from './styles.js';

async function qrDataUrl(payload) {
    return QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        width: 280,
        margin: 2,
    });
}

/**
 * Inner key page content (no HTML/HEAD/BODY wrapper). Shared between the
 * standalone preview and the multi-page print-all wrapper.
 */
export async function buildKeyBody(opts) {
    const {
        vaultName,
        keyAlias,
        keyShare,
        createdAt,
        colors = DEFAULT_COLORS,
    } = opts;

    // QR payload matches PDFKeyBackup.jsx exactly: { ident, key }
    const qrPayload = JSON.stringify({ ident: keyAlias, key: keyShare });
    const qrUrl = await qrDataUrl(qrPayload);
    const colorStrip = colors.map(c => `<span class="color-swatch" style="background:${esc(c)}"></span>`).join('');

    return `<div class="layout">
    <div class="qr-column">
        <div class="qr-box"><img src="${qrUrl}" alt="Key QR"></div>
        <div class="do-not-fold">DO NOT FOLD</div>
    </div>
    <div class="info-column">
        <div class="header-row">
            <h1 class="page-title">PAPERVAULT.XYZ KEY</h1>
            <div class="color-strip">${colorStrip}</div>
        </div>
        <pre class="ascii-art">${KEY_ASCII}</pre>
        <div class="key-alias-display">${esc(keyAlias)}</div>
        <div class="panel">
            <h3>How to Use This Key</h3>
            <ol>
                <li>Go to <strong>papervault.xyz/unlock</strong></li>
                <li>Go offline</li>
                <li>Scan your vault QR code</li>
                <li>Scan the key(s) required to unlock the vault</li>
            </ol>
            <p>The unlock utility is open source: https://github.com/boazeb/papervault</p>
        </div>
        <div class="panel-white">
            <h3>Key Details</h3>
            <div class="detail-row"><strong>Vault:</strong> ${esc(vaultName)}</div>
            <div class="detail-row"><strong>Key Name:</strong> ${esc(keyAlias)}</div>
            <div class="detail-row"><strong>Created:</strong> ${esc(formatTime(createdAt))}</div>
        </div>
        <div class="panel-warning">
            <div class="warning-title">🔒 KEEP SECURE</div>
            <div class="warning-body">Store this key in a safe private location. Give it to its custodian in person, not over a network.</div>
        </div>
    </div>
</div>`;
}

/**
 * Standalone key page (full HTML document).
 *
 * @param {object} opts                   See buildKeyBody, plus:
 * @param {boolean} [opts.autoPrint]
 * @returns {Promise<string>}
 */
export async function generateKeyPage(opts) {
    const body = await buildKeyBody(opts);
    const autoPrintScript = opts.autoPrint
        ? `<script>window.addEventListener('load', () => { setTimeout(() => window.print(), 200); });</script>`
        : '';
    const notice = opts.autoPrint
        ? '<div class="auto-print-notice">Opening print dialog…</div>'
        : '';

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>PaperVault Key — ${esc(opts.keyAlias)}</title>
<style>${SHARED_CSS}</style>
</head>
<body>
${notice}
${body}
${autoPrintScript}
</body>
</html>`;
}
