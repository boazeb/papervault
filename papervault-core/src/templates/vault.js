import QRCode from 'qrcode';
import { SHARED_CSS, VAULT_ASCII, DEFAULT_COLORS, esc, formatTime } from './styles.js';
import { VAULT_IDENT, VAULT_VERSION } from '../constants.js';

// Match PDFVaultBackup.jsx: payloads ≤420 bytes go in one QR; larger payloads
// split into a metadata QR + a data-only QR. Web-app unlock supports both.
const SINGLE_QR_BYTE_THRESHOLD = 420;

async function qrDataUrl(payload) {
    return QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        width: 280,
        margin: 2,
    });
}

/**
 * Build the inner content for a vault page (the `<div class="layout">…</div>`
 * block, without any `<html>/<head>/<body>` wrapper). Reused by both
 * generateVaultPage (standalone preview) and generatePrintAllPage (kit).
 */
export async function buildVaultBody(opts) {
    const {
        vaultName,
        cipherText,
        cipherIV,
        threshold,
        keyAliases,
        createdAt,
        colors = DEFAULT_COLORS,
    } = opts;

    const shares = keyAliases.length;

    const combined = JSON.stringify({
        id: 1,
        vault: VAULT_IDENT,
        version: VAULT_VERSION,
        name: vaultName,
        shares,
        threshold,
        cipherIV,
        keys: keyAliases,
        data: cipherText,
    });
    const combinedBytes = new TextEncoder().encode(combined).length;

    let qrs;
    if (combinedBytes <= SINGLE_QR_BYTE_THRESHOLD) {
        qrs = [{ label: null, dataUrl: await qrDataUrl(combined) }];
    } else {
        const metadataPayload = JSON.stringify({
            id: 1,
            vault: VAULT_IDENT,
            version: VAULT_VERSION,
            name: vaultName,
            shares,
            threshold,
            cipherIV,
            keys: keyAliases,
            qrcodes: 2,
        });
        const dataPayload = JSON.stringify({ id: 2, data: cipherText });
        qrs = [
            { label: 'Vault QR 1 of 2', dataUrl: await qrDataUrl(metadataPayload) },
            { label: 'Vault QR 2 of 2', dataUrl: await qrDataUrl(dataPayload) },
        ];
    }

    const qrBlocks = qrs.map(qr => `
        ${qr.label ? `<div class="qr-label">${esc(qr.label)}</div>` : ''}
        <div class="qr-box"><img src="${qr.dataUrl}" alt="Vault QR"></div>
    `).join('');

    const colorStrip = colors.map(c => `<span class="color-swatch" style="background:${esc(c)}"></span>`).join('');
    const keyPills = keyAliases.map(k => `<span class="key-pill">${esc(k)}</span>`).join(' ');

    return `<div class="layout">
    <div class="qr-column">
        ${qrBlocks}
        <div class="do-not-fold">DO NOT FOLD</div>
    </div>
    <div class="info-column">
        <div class="header-row">
            <h1 class="page-title">PAPERVAULT.XYZ VAULT</h1>
            <div class="color-strip">${colorStrip}</div>
        </div>
        <pre class="ascii-art">${VAULT_ASCII}</pre>
        <div class="panel">
            <h3>How to Unlock</h3>
            <ol>
                <li>Go to <strong>papervault.xyz/unlock</strong></li>
                <li>Go offline</li>
                <li>Scan your vault QR code${qrs.length > 1 ? 's' : ''} (this page)</li>
                <li>Scan ${threshold} key${threshold > 1 ? 's' : ''}</li>
            </ol>
            <p>The unlock utility is open source: https://github.com/boazeb/papervault</p>
        </div>
        <div class="panel-white">
            <h3>Vault Details</h3>
            <div class="detail-row"><strong>Name:</strong> ${esc(vaultName)}</div>
            <div class="detail-row"><strong>Keys Required:</strong> ${threshold} of ${shares}</div>
            <div class="detail-row"><strong>Created:</strong> ${esc(formatTime(createdAt))}</div>
            <div class="detail-row" style="margin-top:8px;"><strong>Key Names:</strong></div>
            <div style="margin-top:4px;">${keyPills}</div>
        </div>
        <div class="panel-warning">
            <div class="warning-title">🔒 KEEP SECURE</div>
            <div class="warning-body">Store this vault in a safe private location.</div>
        </div>
    </div>
</div>`;
}

/**
 * Standalone vault page (full HTML document). Used for individual previews.
 *
 * @param {object} opts                   See buildVaultBody, plus:
 * @param {boolean} [opts.autoPrint]      Trigger window.print() on load
 * @returns {Promise<string>}             Complete HTML document
 */
export async function generateVaultPage(opts) {
    const body = await buildVaultBody(opts);
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
<title>PaperVault — ${esc(opts.vaultName)}</title>
<style>${SHARED_CSS}</style>
</head>
<body>
${notice}
${body}
${autoPrintScript}
</body>
</html>`;
}
