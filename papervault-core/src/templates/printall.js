import { SHARED_CSS, esc } from './styles.js';

/**
 * Single HTML document containing every kit page concatenated with page breaks,
 * so a browser opens ONE native print dialog for the entire packet. From that
 * dialog the user picks Print or "Save as PDF" from the OS dropdown.
 *
 * @param {object} opts
 * @param {string} opts.vaultName
 * @param {string[]} opts.bodies         Inner-body HTML strings, vault first then keys
 * @param {boolean} [opts.autoPrint=true]  Trigger window.print() + window.close() on load
 * @returns {string}                     Complete HTML document
 */
export function generatePrintAllPage(opts) {
    const { vaultName, bodies, autoPrint = true } = opts;

    const pages = bodies.map((body, i) => `<section class="kit-page" data-page="${i}">${body}</section>`).join('\n');

    // After the print dialog returns (resolves or is cancelled), close the
    // popup window so it doesn't sit there empty. Only works because the
    // popup was opened via window.open() from the selector.
    const autoPrintScript = autoPrint ? `
<script>
window.addEventListener('load', () => {
    setTimeout(() => {
        try {
            const before = Date.now();
            window.print();
            // Defer close: some browsers return synchronously from print(),
            // others (Chrome) return after the dialog closes. Either way,
            // closing after a short delay is fine because the popup is
            // owned by us.
            setTimeout(() => { try { window.close(); } catch (e) {} }, 250);
        } catch (e) { /* noop */ }
    }, 200);
});
</script>` : '';

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>PaperVault Kit — ${esc(vaultName)}</title>
<style>${SHARED_CSS}</style>
<style>
.kit-page { padding: 0; margin: 0; }
.kit-page + .kit-page {
    page-break-before: always;
    break-before: page;
    margin-top: 30px;
}
@media print {
    .kit-page + .kit-page {
        page-break-before: always;
        break-before: page;
        margin-top: 0;
    }
}
</style>
</head>
<body>
${autoPrint ? '<div class="auto-print-notice">Opening print dialog…</div>' : ''}
${pages}
${autoPrintScript}
</body>
</html>`;
}
