// Shared CSS for vault + key pages.
// Designed for A4 print output. Single page per HTML document.
// @page rule sets the print size; @media print hides any browser chrome.

export const SHARED_CSS = `
@page {
    size: A4;
    margin: 15mm;
}

* { box-sizing: border-box; }

html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #2c3e50;
    font-family: Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

body {
    padding: 20px;
    max-width: 210mm;
    margin: 0 auto;
}

@media print {
    body { padding: 0; max-width: none; }
}

.layout {
    display: flex;
    flex-direction: row;
    gap: 30px;
    align-items: flex-start;
}

.qr-column {
    flex: 0 0 280px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.qr-box {
    width: 280px;
    height: 280px;
    border: 1px dotted #ccc;
    border-radius: 8px;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
}

.qr-box img { width: 100%; height: 100%; object-fit: contain; }

.qr-label {
    font-size: 11px;
    font-weight: bold;
    color: #495057;
    text-align: center;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.do-not-fold {
    font-size: 14px;
    font-weight: bold;
    font-style: italic;
    color: #dc3545;
    text-align: center;
    margin-top: 15px;
}

.info-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.header-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
}

.page-title {
    font-size: 20px;
    font-weight: bold;
    font-family: Helvetica, Arial, sans-serif;
    margin: 0;
    color: #2c3e50;
}

.color-strip {
    display: flex;
    flex-direction: row;
    gap: 8px;
}

.color-swatch {
    width: 28px;
    height: 28px;
    border: 1px solid #333;
    border-radius: 4px;
}

.ascii-art {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.1;
    white-space: pre;
    text-align: center;
    color: #2c3e50;
    margin: 0;
}

.key-alias-display {
    font-size: 22px;
    font-weight: bold;
    color: #0d6efd;
    text-align: center;
    margin-top: 8px;
    letter-spacing: 0.5px;
}

.panel {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 16px;
}

.panel-white {
    background: #fff;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 16px;
}

.panel-warning {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    padding: 14px;
}

.panel h3 {
    font-size: 16px;
    margin: 0 0 8px 0;
    color: #2c3e50;
}

.panel ol {
    font-size: 13px;
    margin: 0;
    padding-left: 20px;
    color: #495057;
    line-height: 1.5;
}

.panel p {
    font-size: 13px;
    margin: 8px 0 0 0;
    color: #495057;
    line-height: 1.5;
}

.detail-row {
    font-size: 13px;
    color: #495057;
    line-height: 1.7;
}

.detail-row strong { color: #2c3e50; }

.key-pill {
    display: inline-block;
    padding: 2px 8px;
    margin: 2px 4px 2px 0;
    background: #e9ecef;
    border: 1px solid #ced4da;
    border-radius: 12px;
    font-size: 12px;
    color: #495057;
}

.warning-title {
    font-size: 14px;
    font-weight: bold;
    color: #856404;
    margin-bottom: 4px;
}

.warning-body {
    font-size: 13px;
    color: #856404;
}

.toolbar {
    /* Hidden in print. Shown only in browser, used by selector iframe. */
    display: none;
}

@media screen {
    .auto-print-notice {
        position: fixed;
        top: 12px;
        right: 12px;
        background: #2c3e50;
        color: #fff;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 13px;
        font-family: Helvetica, Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
    }
}

@media print {
    .auto-print-notice { display: none !important; }
}
`;

// ASCII art reused from the React PDFVaultBackup + PDFKeyBackup components.
// Each line is right-padded to the widest line so `text-align: center` plus
// `white-space: pre` doesn't center each row independently — otherwise the
// columns drift. Editors that strip trailing whitespace would silently break
// the alignment, so we compute the padding at runtime instead of relying on
// the source-file spaces being preserved.

function rightPadBlock(lines) {
    const width = Math.max(...lines.map(l => l.length));
    return lines.map(l => l.padEnd(width)).join('\n');
}

export const VAULT_ASCII = rightPadBlock([
    ' ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗',
    ' ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝',
    ' ██║   ██║███████║██║   ██║██║     ██║',
    ' ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║',
    '  ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║',
    '   ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝',
]);

export const KEY_ASCII = rightPadBlock([
    ' ██╗  ██╗███████╗██╗   ██╗',
    ' ██║ ██╔╝██╔════╝╚██╗ ██╔╝',
    ' █████╔╝ █████╗   ╚████╔╝',
    ' ██╔═██╗ ██╔══╝    ╚██╔╝',
    ' ██║  ██╗███████╗   ██║',
    ' ╚═╝  ╚═╝╚══════╝   ╚═╝',
]);

// Default 3-color identifier strip — matches the web app's defaults.
export const DEFAULT_COLORS = ['#FF0000', '#0000FF', '#008000'];

/** Basic HTML escape. Used for any user-supplied string. */
export function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Format a unix-seconds timestamp as YYYY-MM-DD HH:mm:ss in local time. */
export function formatTime(unixSeconds) {
    const d = new Date(unixSeconds * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
