// Audit logging. Records what was done, NEVER what was in it.
// Default location: ~/.papervault/audit.log
// Format: one JSON object per line (jsonl) — easy to grep + parse.

import { appendFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

function auditPath() {
    return process.env.PAPERVAULT_AUDIT_LOG || join(homedir(), '.papervault', 'audit.log');
}

/**
 * @param {object} entry
 * @param {string} entry.action            e.g. 'backup', 'verify', 'sources.list'
 * @param {string} [entry.sourceUri]
 * @param {number} [entry.secretCount]
 * @param {number} [entry.threshold]
 * @param {number} [entry.shares]
 * @param {string} [entry.vaultId]
 * @param {string} [entry.outcome]         'success' | 'failed' | 'aborted'
 * @param {string} [entry.error]
 * @param {string[]} [entry.secretNames]   Hashed before write unless PAPERVAULT_LOG_NAMES=1
 */
export async function audit(entry) {
    const path = auditPath();
    try {
        await mkdir(dirname(path), { recursive: true });
    } catch { /* dir might exist; OK */ }

    const logNamesPlaintext = process.env.PAPERVAULT_LOG_NAMES === '1';
    const safe = { ...entry };
    if (Array.isArray(entry.secretNames)) {
        if (logNamesPlaintext) {
            safe.secretNames = entry.secretNames;
        } else {
            // Deterministic fingerprint of the sorted name list. Lets you tell
            // two runs covered the same set without revealing the names.
            const sorted = [...entry.secretNames].sort().join('\n');
            safe.namesFingerprint = createHash('sha256').update(sorted).digest('hex').slice(0, 16);
            delete safe.secretNames;
        }
    }
    safe.ts = new Date().toISOString();
    try {
        await appendFile(path, JSON.stringify(safe) + '\n', 'utf8');
    } catch (err) {
        // Audit log failures should never crash the main flow.
        process.stderr.write(`audit log warning: ${err.message}\n`);
    }
}
