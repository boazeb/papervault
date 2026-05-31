import { esc } from './styles.js';

/**
 * Orchestration page: shows the kit manifest with a single "Print kit" button
 * that opens the full packet in one native print dialog. From there the user
 * picks Print or "Save as PDF" via the OS dropdown. Bytes never touch disk.
 *
 * @param {object} opts
 * @param {string} opts.vaultName
 * @param {number} opts.threshold
 * @param {number} opts.shares
 * @param {Array<{kind: 'vault'|'key', label: string, seq: string|null, alias: string|null, custodian: string|null}>} opts.pages
 * @param {string} opts.printAllPath     Server path that returns the full packet HTML
 */
export function generateSelectorPage(opts) {
    const { vaultName, threshold, shares, pages, printAllPath } = opts;

    const rows = pages.map((p) => {
        const icon = p.kind === 'vault' ? '📄' : '🔑';
        let labelHtml;
        if (p.kind === 'vault') {
            labelHtml = `<span class="row-label">${esc(p.label)}</span>`;
        } else {
            const custodian = p.custodian
                ? ` <span class="row-custodian">→ ${esc(p.custodian)}</span>`
                : '';
            labelHtml = `<span class="row-seq">${esc(p.seq)}</span><span class="row-alias">${esc(p.alias ?? p.label)}</span>${custodian}`;
        }
        return `<tr>
            <td class="cell-icon">${icon}</td>
            <td class="cell-label">${labelHtml}</td>
        </tr>`;
    }).join('');

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>PaperVault.xyz Kit — ${esc(vaultName)}</title>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #2c3e50; }
.container { max-width: 720px; margin: 40px auto; padding: 0 20px; }
.card { background: #fff; border: 1px solid #e9ecef; border-radius: 12px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
h1 { font-size: 22px; margin: 0 0 4px 0; }
.subtitle { color: #6c757d; font-size: 14px; margin: 0 0 24px 0; }

.print-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 18px 20px;
    background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);
    border-radius: 10px;
}
.print-bar-text { color: #fff; flex: 1; }
.print-bar-text .title { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
.print-bar-text .hint { font-size: 12px; opacity: 0.85; }
.print-button {
    font-size: 15px; font-weight: 600; padding: 10px 22px;
    border-radius: 7px; border: none; background: #fff; color: #0d6efd;
    cursor: pointer; font-family: inherit;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.print-button:hover { background: #f1f5fb; }

/* Lives below the print bar — only rendered after the first click,
   so it doesn't reserve empty space and unbalance the bar. */
.print-status {
    font-size: 12px;
    color: #198754;
    margin: 10px 4px 0 4px;
    padding-left: 2px;
}
.print-bar-wrap { margin-bottom: 24px; }

table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #8a94a3; padding: 8px 6px; border-bottom: 1px solid #e9ecef; font-weight: 600; }
td { padding: 12px 6px; border-bottom: 1px solid #f0f2f5; vertical-align: middle; }
tr:last-child td { border-bottom: none; }

.cell-icon { width: 32px; font-size: 20px; }
.cell-label { /* contains seq + alias for keys, or just a label for vault */ }

.row-label { font-size: 14px; font-weight: 600; color: #2c3e50; }
.row-seq {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    color: #8a94a3;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-right: 10px;
    min-width: 38px;
}
.row-alias {
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 14px;
    font-weight: 600;
    color: #0d6efd;
    letter-spacing: 0.2px;
}
.row-custodian {
    margin-left: 8px;
    color: #6c757d;
    font-size: 12px;
    font-style: italic;
}

.footer { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e9ecef; }
.footer-branding { font-size: 12px; color: #8a94a3; }
.footer-branding a { color: #6c757d; text-decoration: none; font-weight: 600; }
.footer-branding a:hover { color: #0d6efd; text-decoration: underline; }
.done-button { font-size: 14px; padding: 10px 18px; border-radius: 6px; border: 1px solid #dee2e6; background: #fff; color: #6c757d; cursor: pointer; font-family: inherit; }
.done-button:hover { background: #f8f9fa; color: #2c3e50; }
.done-button.ready { background: #198754; border-color: #198754; color: #fff; }
.done-button.ready:hover { background: #157347; }

.modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; z-index: 1000; }
.modal.open { display: flex; }
.modal-card { background: #fff; border-radius: 12px; padding: 28px; max-width: 420px; text-align: center; }
.modal-card h2 { margin: 0 0 12px 0; font-size: 20px; }
.modal-card p { color: #6c757d; margin: 0 0 8px 0; line-height: 1.5; }
.modal-card .fine { font-size: 12px; color: #8a94a3; margin-top: 14px; }
</style>
</head>
<body>
<div class="container">
    <div class="card">
        <h1>PaperVault.xyz Kit Ready</h1>
        <p class="subtitle">${esc(vaultName)} — ${threshold} of ${shares} keys</p>

        <div class="print-bar-wrap">
            <div class="print-bar">
                <div class="print-bar-text">
                    <div class="title">Print the whole packet</div>
                    <div class="hint">${pages.length} pages</div>
                </div>
                <button class="print-button" onclick="printKit()">Print kit</button>
            </div>
            <div class="print-status" id="status"></div>
        </div>

        <table>
            <thead><tr><th></th><th>Contents</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>

        <div class="footer">
            <div class="footer-branding">powered by <a href="https://papervault.xyz" target="_blank" rel="noopener">papervault.xyz</a></div>
            <button id="doneBtn" class="done-button" onclick="doneAndExit()">Done</button>
        </div>
    </div>
</div>

<div class="modal" id="doneModal">
    <div class="modal-card">
        <h2>Done</h2>
        <p>The server has stopped and the kit is no longer reachable from this tab.</p>
    </div>
</div>

<script>
let actionCount = 0;
const PRINT_ALL = ${JSON.stringify(printAllPath)};

function printKit() {
    const w = window.open(PRINT_ALL, 'papervault-print', 'width=900,height=1100');
    if (!w) {
        alert('Popup blocked. Please allow popups for this page so the print dialog can open.');
        return;
    }
    actionCount++;
    const status = document.getElementById('status');
    status.textContent = actionCount === 1
        ? '✓ Print dialog opened.'
        : '✓ Print dialog opened (' + actionCount + ' times).';
    document.getElementById('doneBtn').classList.add('ready');
}

async function doneAndExit() {
    try { await fetch('/__shutdown', { method: 'POST' }); } catch (e) { /* already gone */ }
    document.getElementById('doneModal').classList.add('open');
}

window.addEventListener('beforeunload', (e) => {
    if (actionCount === 0) {
        e.preventDefault();
        e.returnValue = 'You have not printed the kit yet. It will be lost.';
    }
});
</script>
</body>
</html>`;
}
