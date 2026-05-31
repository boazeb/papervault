// Convert structured CLI-input secrets into the web-app's ultra-compact format,
// matching papervault/src/components/SecretDataEntry.jsx convertToCompressedText().
// This is the plaintext that gets AES-GCM encrypted, so byte-identical output
// is what makes kits unlockable on papervault.xyz.
//
// Also exposes countUserContent() — character-counting that mirrors the web
// app's getUserContentLength(): sum of non-empty field values across all
// structured entries + freeText, EXCLUDING JSON overhead. This is what gets
// compared against LIMITS.MAX_STORAGE (300 chars) so the QR stays scannable.

import { LIMITS } from './constants.js';

// Field orders MUST match SecretDataEntry.jsx exactly.
const FIELD_ORDER = {
    passwords: ['service', 'username', 'password', 'url', 'notes'],
    wallets: ['name', 'seed', 'privateKey', 'address', 'notes'],
    notes: ['title', 'content'],
    apiKeys: ['service', 'key', 'secret', 'notes'],
    custom: ['label', 'value', 'notes'],
};

const ALLOWED_KINDS = new Set([
    'password', 'wallet', 'note', 'apikey', 'custom',
]);

// Map singular kind -> plural section name used in the compressed format.
const KIND_TO_SECTION = {
    password: 'passwords',
    wallet: 'wallets',
    note: 'notes',
    apikey: 'apiKeys',
    custom: 'custom',
};

// Map well-known CLI field names -> structured entry. Lets users write
// {"name": "github", "value": "ghp_..."} as a generic shape and we put it
// in the right field slot per kind.
function normalizeEntry(kind, raw) {
    if (kind === 'password') {
        return {
            service: raw.service ?? raw.name ?? '',
            username: raw.username ?? raw.user ?? '',
            password: raw.password ?? raw.value ?? '',
            url: raw.url ?? '',
            notes: raw.notes ?? '',
        };
    }
    if (kind === 'wallet') {
        return {
            name: raw.name ?? raw.service ?? '',
            seed: raw.seed ?? raw.mnemonic ?? raw.value ?? '',
            privateKey: raw.privateKey ?? raw.private_key ?? '',
            address: raw.address ?? '',
            notes: raw.notes ?? '',
        };
    }
    if (kind === 'note') {
        return {
            title: raw.title ?? raw.name ?? '',
            content: raw.content ?? raw.value ?? raw.body ?? '',
        };
    }
    if (kind === 'apikey') {
        return {
            service: raw.service ?? raw.name ?? '',
            key: raw.key ?? raw.value ?? '',
            secret: raw.secret ?? '',
            notes: raw.notes ?? '',
        };
    }
    // custom
    return {
        label: raw.label ?? raw.name ?? '',
        value: raw.value ?? '',
        notes: raw.notes ?? '',
    };
}

function createUltraCompactArray(values) {
    const result = [];
    for (const v of values) {
        if (v && String(v).trim() !== '') {
            result.push(String(v));
        }
    }
    return result.length > 0 ? result : null;
}

/**
 * @param {Array<{kind: string, [k: string]: any}>} secrets - User-facing structured input
 * @param {string} [freeText] - Optional freeform text block
 * @returns {string} - Compressed JSON exactly matching the web-app format
 */
export function compress(secrets, freeText) {
    if (!Array.isArray(secrets)) {
        throw new Error('compress: secrets must be an array.');
    }
    if (secrets.length > LIMITS.MAX_KEYS * 5) {
        // Loose upper bound; the real cap comes from QR payload size.
        throw new Error('compress: too many secrets.');
    }

    // Group entries by section in the order the web app expects.
    const sections = { passwords: [], wallets: [], notes: [], apiKeys: [], custom: [] };

    for (const raw of secrets) {
        if (!raw || typeof raw !== 'object') {
            throw new Error('compress: each secret must be an object.');
        }
        const kind = String(raw.kind || '').toLowerCase();
        if (!ALLOWED_KINDS.has(kind)) {
            throw new Error(`compress: unknown kind "${kind}". Allowed: ${[...ALLOWED_KINDS].join(', ')}.`);
        }
        const section = KIND_TO_SECTION[kind];
        const normalized = normalizeEntry(kind, raw);
        const ordered = FIELD_ORDER[section].map(f => normalized[f] ?? '');
        const compact = createUltraCompactArray(ordered);
        if (compact) sections[section].push(compact);
    }

    const cleanData = {};
    const sectionsWithData = [];
    for (const section of Object.keys(sections)) {
        if (sections[section].length > 0) {
            cleanData[section] = sections[section];
            sectionsWithData.push(section);
        }
    }
    if (freeText && String(freeText).trim() !== '') {
        cleanData.freeText = String(freeText);
        sectionsWithData.push('freeText');
    }

    // Same optimizations as SecretDataEntry.jsx — important for byte-identical output.
    const nonFreeTextSections = sectionsWithData.filter(s => s !== 'freeText');
    if (nonFreeTextSections.length === 1 && !cleanData.freeText) {
        const onlySection = nonFreeTextSections[0];
        const data = cleanData[onlySection];
        if (data.length === 1) return JSON.stringify(data[0]);
        return JSON.stringify(data);
    }
    return Object.keys(cleanData).length > 0 ? JSON.stringify(cleanData) : '';
}

/**
 * Sum the character lengths of all non-empty string field values across the
 * input secrets, plus freeText. Matches the web app's getUserContentLength()
 * exactly so the same content hits the same limit in both places.
 *
 * @param {Array<object>} secrets
 * @param {string} [freeText]
 * @returns {number}
 */
export function countUserContent(secrets, freeText) {
    if (!Array.isArray(secrets)) return 0;
    let total = 0;
    for (const entry of secrets) {
        if (!entry || typeof entry !== 'object') continue;
        for (const [key, value] of Object.entries(entry)) {
            if (key === 'kind') continue; // metadata, not user content
            if (typeof value === 'string' && value) {
                total += value.length;
            }
        }
    }
    if (freeText && typeof freeText === 'string') {
        total += freeText.length;
    }
    return total;
}
