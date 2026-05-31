// Shared kit-generation flow: createKit → optional disk save → optional
// ephemeral print server. Reused by `backup` (after fetching from a source)
// and by `init` (after manual entry or .env import).
//
// Keeps the in-memory-only posture consistent: secrets only touch disk if
// the caller explicitly opts in via savePath.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createKit } from '@papervault/core';

import { servePrintKit } from './server.js';
import { openUrl } from './browser.js';

/**
 * @param {object} opts
 * @param {Array<object>} opts.secrets        Structured secrets array
 * @param {string} [opts.freeText]
 * @param {string} opts.vaultName
 * @param {number} opts.threshold
 * @param {number} opts.shares
 * @param {string[]} [opts.custodianNames]
 * @param {string} [opts.savePath]            If set, also writes HTML to <savePath>/vault-<id>/
 * @param {boolean} [opts.print=true]         If true, opens the ephemeral print server in the browser
 * @returns {Promise<{vaultId: string, savedTo: string|null, printed: boolean}>}
 */
export async function runKitFlow(opts) {
    const {
        secrets, freeText, vaultName, threshold, shares,
        custodianNames, savePath, print = true,
    } = opts;

    const kit = await createKit({
        secrets,
        freeText,
        vaultName,
        threshold,
        shares,
        custodianNames,
    });

    // Optional disk save (opt-in). Saved files have the auto-print script
    // stripped — they're for archival, not for the immediate dialog.
    let savedTo = null;
    if (savePath) {
        savedTo = resolve(savePath, `vault-${kit.vaultId}`);
        await mkdir(savedTo, { recursive: true });
        for (const page of kit.pages) {
            const html = page.html.replace(
                /<script>window\.addEventListener\('load',.*?<\/script>/g, ''
            );
            await writeFile(join(savedTo, `${page.filename}.html`), html, 'utf8');
        }
        process.stderr.write(`\nSaved ${kit.pages.length} files to ${savedTo}\n`);
    }

    if (!print) {
        if (!savedTo) {
            process.stderr.write('Note: print=false and no savePath means the kit was generated but discarded.\n');
        }
        return { vaultId: kit.vaultId, savedTo, printed: false };
    }

    const { url, done } = await servePrintKit(kit);
    process.stderr.write('\nPaperVault kit ready in memory.\n');
    process.stderr.write(`Opening browser: ${url}\n`);
    process.stderr.write('(Click "Done" in the browser when finished to stop the server and exit.)\n');
    openUrl(url);
    await done;
    process.stderr.write('Server stopped. Kit references dropped. Exiting.\n');
    return { vaultId: kit.vaultId, savedTo, printed: true };
}
