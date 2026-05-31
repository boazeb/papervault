// Input validation + safety guardrails for MCP tool calls.
// The MCP risk model: an agent may be confused, miscalibrated, or compromised.
// Every input crosses a trust boundary, so we re-validate aggressively even
// when the underlying core lib already does its own checks.

import { isAbsolute, normalize } from 'node:path';

export const HARD_MAX_SECRETS = 20;
export const HARD_MAX_SHARES = 20;
export const MAX_AUDIT_LIMIT = 100;

// Paths we refuse to write to, regardless of what the agent asks. These are
// either critical (/etc, /usr) or fake-filesystems where writes don't behave
// like writes (/proc, /dev, /sys).
const FORBIDDEN_PATH_PREFIXES = [
    '/etc/', '/usr/', '/bin/', '/sbin/', '/boot/',
    '/proc/', '/sys/', '/dev/',
    'C:\\Windows\\', 'C:\\Program Files\\',
];

export function validateSavePath(p) {
    if (typeof p !== 'string' || p.length === 0) {
        throw new Error('save_path must be a non-empty string.');
    }
    if (!isAbsolute(p)) {
        throw new Error('save_path must be an absolute filesystem path (e.g. /Users/me/backups, not "./backups").');
    }
    const norm = normalize(p);
    for (const bad of FORBIDDEN_PATH_PREFIXES) {
        if (norm.startsWith(bad) || norm === bad.replace(/\/$/, '')) {
            throw new Error(`save_path refused: writing under ${bad} is not allowed.`);
        }
    }
    return norm;
}

export function validateInteger(value, name, { min, max } = {}) {
    const n = Number(value);
    if (!Number.isInteger(n)) {
        throw new Error(`${name} must be an integer, got ${typeof value} (${value}).`);
    }
    if (min != null && n < min) throw new Error(`${name} must be >= ${min}.`);
    if (max != null && n > max) throw new Error(`${name} must be <= ${max}.`);
    return n;
}

export function validateString(value, name, { maxLength = 200 } = {}) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`${name} must be a non-empty string.`);
    }
    if (value.length > maxLength) {
        throw new Error(`${name} exceeds maximum length of ${maxLength}.`);
    }
    return value;
}

export function validateNames(value, expectedLength) {
    if (value == null) return undefined;
    if (!Array.isArray(value)) throw new Error('names must be an array of strings.');
    if (value.length !== expectedLength) {
        throw new Error(`names has ${value.length} entries but shares is ${expectedLength}.`);
    }
    for (const [i, n] of value.entries()) {
        if (typeof n !== 'string' || n.length === 0) {
            throw new Error(`names[${i}] must be a non-empty string.`);
        }
        if (n.length > 60) throw new Error(`names[${i}] exceeds 60 chars.`);
    }
    return value;
}

/** Build a glob-to-regex predicate from a comma-separated --select pattern. */
export function makeGlobFilter(selectStr) {
    if (!selectStr) return () => true;
    const patterns = selectStr.split(',').map(s => s.trim()).filter(Boolean).map(g => {
        const escaped = g.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
        return new RegExp('^' + escaped.join('.*') + '$');
    });
    return (name) => patterns.some(p => p.test(name));
}
