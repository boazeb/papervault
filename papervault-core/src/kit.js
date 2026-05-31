// High-level orchestrator: turns a list of user-facing secrets into a printable
// PaperVault kit. Output is in-memory only — the caller decides whether to
// serve it from a localhost server, write to disk, or both.

import {
    encrypt, splitKey, generateKeyAliases, generateVaultId,
    secureRandomBytes,
} from './crypto.js';
import { compress, countUserContent } from './compress.js';
import {
    generateVaultPage, buildVaultBody,
    generateKeyPage, buildKeyBody,
    generatePrintAllPage,
} from './templates/index.js';
import { LIMITS } from './constants.js';

const DEFAULT_COLOR_PALETTE = [
    '#FF0000', '#0000FF', '#008000', '#FFA500', '#800080',
    '#A52A2A', '#000000', '#FF00FF', '#00FFFF', '#FFD700',
];

function pickThreeColors() {
    const pool = [...DEFAULT_COLOR_PALETTE];
    const picked = [];
    for (let i = 0; i < 3 && pool.length > 0; i++) {
        const idx = secureRandomBytes(1)[0] % pool.length;
        picked.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return picked;
}

/**
 * Compute per-entry char contribution (matches countUserContent semantics:
 * all non-empty string fields except `kind`). Returns entries sorted by
 * char count descending — used to call out the biggest offenders when a
 * vault exceeds MAX_STORAGE.
 */
function summarizeCharsPerEntry(secrets) {
    if (!Array.isArray(secrets)) return [];
    return secrets.map(s => {
        let chars = 0;
        if (s && typeof s === 'object') {
            for (const [key, val] of Object.entries(s)) {
                if (key === 'kind') continue;
                if (typeof val === 'string' && val) chars += val.length;
            }
        }
        const name = s?.name ?? s?.label ?? s?.service ?? s?.title ?? '<unnamed>';
        return { name, chars };
    }).sort((a, b) => b.chars - a.chars);
}

/**
 * @typedef {object} KitPage
 * @property {'vault'|'key'} kind
 * @property {string} filename       Filesystem-safe basename (no extension)
 * @property {string} label          Display label, e.g. "Vault PDF". For keys
 *                                   this is just the alias (the seq # is
 *                                   carried separately so the UI can style
 *                                   the two parts differently).
 * @property {string|null} seq       e.g. "Key 1" for key pages, null for vault
 * @property {string|null} alias     Two-word alias for key pages
 * @property {string|null} custodian Optional custodian name
 * @property {string} html           Full standalone HTML document (for preview/save)
 *
 * @typedef {object} Kit
 * @property {string} vaultId
 * @property {string} vaultName
 * @property {number} threshold
 * @property {number} shares
 * @property {string[]} keyAliases
 * @property {string[]} keyShares
 * @property {string} cipherKeyHex
 * @property {string} cipherTextHex
 * @property {string} cipherIvHex
 * @property {string[]} colors
 * @property {number} createdAt
 * @property {KitPage[]} pages
 * @property {string} printAllHtml   Single doc containing every page, for
 *                                   one-shot printing of the whole packet.
 */

/**
 * Build a complete in-memory PaperVault kit.
 *
 * @param {object} opts
 * @param {Array<object>} opts.secrets
 * @param {string} [opts.freeText]
 * @param {string} opts.vaultName
 * @param {number} opts.threshold
 * @param {number} opts.shares
 * @param {string[]} [opts.custodianNames]
 * @param {string[]} [opts.colors]
 * @returns {Promise<Kit>}
 */
export async function createKit(opts) {
    const {
        secrets,
        freeText,
        vaultName,
        threshold,
        shares,
        custodianNames,
        colors,
    } = opts;

    if (!vaultName || typeof vaultName !== 'string') {
        throw new Error('createKit: vaultName is required.');
    }
    if (!Number.isInteger(shares) || shares < 1 || shares > LIMITS.MAX_KEYS) {
        throw new Error(`createKit: shares must be 1..${LIMITS.MAX_KEYS}.`);
    }
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > shares) {
        throw new Error('createKit: threshold must be 1..shares.');
    }
    if (shares > 1 && threshold < 2) {
        throw new Error('createKit: Shamir requires threshold >= 2 when shares > 1.');
    }

    // Count USER CONTENT only (matches web app's getUserContentLength).
    // The compressed JSON plaintext is larger due to bracket/quote overhead,
    // but that's not the user-facing limit — MAX_STORAGE bounds the content
    // the user actually typed so the QR stays scannable on real paper.
    const userChars = countUserContent(secrets, freeText);
    if (userChars === 0) {
        throw new Error('createKit: no secrets to back up.');
    }
    if (userChars > LIMITS.MAX_STORAGE) {
        // Surface entry SIZES (not names): error messages can flow into
        // audit logs and MCP responses, where plaintext names would
        // undercut our "names hashed by default" promise. Sizes alone
        // let the user identify the heaviest entries when they inspect
        // their own source.
        const numEntries = Array.isArray(secrets) ? secrets.length : 0;
        const freeTextChars = (freeText && typeof freeText === 'string') ? freeText.length : 0;
        const sizes = summarizeCharsPerEntry(secrets).slice(0, 5).map(t => t.chars);
        const breakdown = [
            `${numEntries} entr${numEntries === 1 ? 'y' : 'ies'}`,
            freeTextChars > 0 ? `freeText (${freeTextChars} chars)` : null,
        ].filter(Boolean).join(' + ');
        const sizesStr = sizes.length > 0 ? `Largest entries by chars: ${sizes.join(', ')}. ` : '';
        throw new Error(
            `createKit: ${userChars}/${LIMITS.MAX_STORAGE} chars used (${breakdown}). ` +
            sizesStr +
            `Matches papervault.xyz so QR codes stay scannable on paper. ` +
            `Drop or shorten entries${freeTextChars > 0 ? ' or freeText' : ''}, or split across multiple vaults.`
        );
    }

    const plaintext = compress(secrets, freeText);
    if (!plaintext) {
        throw new Error('createKit: no secrets to back up.');
    }

    const { cipherText, cipherKey, cipherIV } = await encrypt(plaintext);

    let keyShares;
    if (shares === 1) {
        keyShares = [cipherKey];
    } else {
        keyShares = await splitKey(cipherKey, shares, threshold);
    }

    const aliases = generateKeyAliases(shares);
    const effectiveColors = colors && colors.length > 0 ? colors : pickThreeColors();
    const createdAt = Math.floor(Date.now() / 1000);
    const vaultId = generateVaultId();

    // Build both the standalone page (for preview/save) and the body fragment
    // (for the print-all wrapper) from one shared template.
    const vaultBaseOpts = {
        vaultName, cipherText, cipherIV, threshold,
        keyAliases: aliases, createdAt, colors: effectiveColors,
    };
    const vaultBody = await buildVaultBody(vaultBaseOpts);
    const vaultHtml = await generateVaultPage(vaultBaseOpts);

    /** @type {KitPage[]} */
    const pages = [
        {
            kind: 'vault',
            filename: 'vault',
            label: 'Vault PDF',
            seq: null,
            alias: null,
            custodian: null,
            html: vaultHtml,
        },
    ];

    /** Body fragments, parallel to pages[] — used to assemble print-all. */
    const bodies = [vaultBody];

    for (let i = 0; i < shares; i++) {
        const alias = aliases[i];
        const custodian = custodianNames?.[i] ?? null;
        const keyBaseOpts = {
            vaultName,
            keyAlias: alias,
            keyShare: keyShares[i],
            createdAt,
            colors: effectiveColors,
        };
        const keyBody = await buildKeyBody(keyBaseOpts);
        const keyHtml = await generateKeyPage(keyBaseOpts);

        pages.push({
            kind: 'key',
            filename: `key-${i + 1}-${alias}`,
            label: alias,
            seq: `Key ${i + 1}`,
            alias,
            custodian,
            html: keyHtml,
        });
        bodies.push(keyBody);
    }

    const printAllHtml = generatePrintAllPage({
        vaultName,
        bodies,
        autoPrint: true,
    });

    return {
        vaultId,
        vaultName,
        threshold,
        shares,
        keyAliases: aliases,
        keyShares,
        cipherKeyHex: cipherKey,
        cipherTextHex: cipherText,
        cipherIvHex: cipherIV,
        colors: effectiveColors,
        createdAt,
        pages,
        printAllHtml,
    };
}
