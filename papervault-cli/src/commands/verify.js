import { parseArgs } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { decrypt, combineShares } from '@papervault/core';
import { audit } from '../audit.js';

const HELP = `papervault verify <kit-dir> — decrypt-check a saved kit

Reads vault.html and key-*.html from a saved kit directory, extracts the QR
payloads, recombines a threshold of shares, and confirms the vault decrypts.

Outputs OK / FAILED and the secret count — never the secret values.

Usage:
  papervault verify <kit-dir> [options]

Options:
  --threshold N         Number of shares to use (default: all that are present)
  --help
`;

const OPTIONS = {
    threshold: { type: 'string' },
    help: { type: 'boolean' },
};

// Extract { ... } JSON payload from an HTML kit page. We embedded the raw
// JSON behind the QR image — but to keep verify self-contained we scan the
// rendered QR data URL's *source data* by re-parsing the HTML for the literal
// payload via a sentinel field. For MVP simplicity, we look for the QR <img
// alt> + a sibling <script id="payload"> we add when saving. If absent, the
// user can pass --threshold and we'll decrypt by recombining the cipherKey
// from key shares.
//
// MVP approach: the saved HTML pages don't expose the cipher payload directly
// (only the QR image). For verify we re-derive by reading the embedded
// metadata pill in the vault page. To keep this honest, MVP verify only works
// against saves produced by this CLI; we annotate a tiny JSON block in the
// HTML's <head> via a <meta name="papervault:debug" content='{...}'> tag.
//
// To keep the MVP small and safe, we instead require the user to point us at
// the JSON sidecar file (`vault.json`) we write alongside the HTML in --save
// mode (planned). For now, verify is a no-op stub.
//
// TODO(v0.2): emit a vault.json sidecar in --save and parse it here.

export async function verify(argv) {
    const { values, positionals } = parseArgs({
        args: argv, options: OPTIONS, allowPositionals: true,
    });
    if (values.help || positionals.length === 0) {
        process.stdout.write(HELP);
        return;
    }
    const dir = positionals[0];
    let entries;
    try {
        entries = await readdir(dir);
    } catch (err) {
        throw new Error(`verify: cannot read ${dir} — ${err.message}`);
    }

    process.stderr.write(`verify: found ${entries.length} files in ${dir}\n`);
    process.stderr.write('verify: full decrypt-roundtrip is on the v0.2 roadmap (needs vault.json sidecar).\n');
    process.stderr.write('verify: for now you can confirm a kit by scanning QRs at papervault.xyz/unlock.\n');

    await audit({ action: 'verify', outcome: 'not-implemented', dir });
    // Touch the imports so they aren't unused — keeps the verify symbol shaped
    // correctly for when we wire it up.
    void decrypt; void combineShares; void readFile; void join;
}
