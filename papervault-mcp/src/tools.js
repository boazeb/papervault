// Tool schemas + handlers exposed by the PaperVault MCP server.
//
// Every handler MUST:
//   - Validate inputs aggressively (see safety.js) — agents are untrusted
//   - Audit the invocation via @papervault/cli/audit
//   - Never return secret values in the response
//   - Return JSON-stringified content (MCP convention for structured data)

import { mkdir, writeFile, readFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

import { createKit } from '@papervault/core';
import { resolveSource, SUPPORTED_SOURCES } from '@papervault/cli/sources';
import { audit } from '@papervault/cli/audit';

import {
    HARD_MAX_SECRETS, HARD_MAX_SHARES, MAX_AUDIT_LIMIT,
    validateSavePath, validateInteger, validateString, validateNames,
    makeGlobFilter,
} from './safety.js';

/** Helper: wrap structured data in MCP's content-array format. */
function ok(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
function fail(message, details) {
    const payload = details ? { error: message, ...details } : { error: message };
    return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: true };
}

function fingerprint(names) {
    const sorted = [...names].sort().join('\n');
    return createHash('sha256').update(sorted).digest('hex').slice(0, 16);
}

// =====================================================================
// Tool definitions (schemas advertised to clients)
// =====================================================================

export const TOOLS = [
    {
        name: 'papervault_backup_from_source',
        description:
            'Generate a PaperVault disaster-recovery kit from a configured secret source. ' +
            'Encrypts secrets with AES-256-GCM, splits the key with Shamir Secret Sharing, ' +
            'and writes printable HTML pages to a local directory. ' +
            'NEVER returns secret values in the response. ' +
            'Designed as a safety step before sensitive operations — e.g. before rotating a ' +
            'production key, snapshot the old credentials to paper. ' +
            `Hard limit: ${HARD_MAX_SECRETS} secrets per call. ` +
            'save_path must be an absolute local filesystem path; no network upload supported.',
        inputSchema: {
            type: 'object',
            properties: {
                source_uri: {
                    type: 'string',
                    description: 'Source URI. Schemes: file://<path>, stdin (-), azure-kv://<vault-name>. ' +
                        'See papervault_list_sources for the full list.',
                },
                threshold: {
                    type: 'integer',
                    minimum: 1,
                    description: 'Minimum number of key shares needed to unlock the vault.',
                },
                shares: {
                    type: 'integer',
                    minimum: 1,
                    maximum: HARD_MAX_SHARES,
                    description: `Total number of key shares to generate (1..${HARD_MAX_SHARES}).`,
                },
                save_path: {
                    type: 'string',
                    description: 'Absolute filesystem directory where the kit will be written. ' +
                        'Files go in <save_path>/vault-<id>/. Created if missing.',
                },
                select: {
                    type: 'string',
                    description: 'Comma-separated glob patterns to filter secret names (e.g. "prod-*,db-*").',
                },
                max_secrets: {
                    type: 'integer',
                    minimum: 1,
                    maximum: HARD_MAX_SECRETS,
                    description: `Hard cap on selected secrets. Default and absolute max: ${HARD_MAX_SECRETS}.`,
                },
                vault_name: {
                    type: 'string',
                    description: 'Label printed on the kit (defaults to "Disaster Recovery Kit").',
                },
                names: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Per-share custodian labels (length must equal shares).',
                },
            },
            required: ['source_uri', 'threshold', 'shares', 'save_path'],
        },
    },
    {
        name: 'papervault_dry_run',
        description:
            'Preview what papervault_backup_from_source would do without pulling any secret values. ' +
            'Returns the count + a deterministic 16-char fingerprint of the secret names that would be ' +
            'backed up. Use this to confirm scope before committing to a real backup.',
        inputSchema: {
            type: 'object',
            properties: {
                source_uri: { type: 'string' },
                select:     { type: 'string' },
                max_secrets: { type: 'integer', minimum: 1, maximum: HARD_MAX_SECRETS },
            },
            required: ['source_uri'],
        },
    },
    {
        name: 'papervault_list_sources',
        description: 'List the secret source backends supported by this server with their availability.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'papervault_audit_recent',
        description:
            'Read recent entries from the PaperVault audit log. Records are JSONL — one backup ' +
            'invocation per line. NEVER contains secret values; secret names are hashed to a ' +
            '16-char fingerprint by default.',
        inputSchema: {
            type: 'object',
            properties: {
                limit: { type: 'integer', minimum: 1, maximum: MAX_AUDIT_LIMIT },
            },
        },
    },
];

// =====================================================================
// Handlers
// =====================================================================

export async function handleListSources() {
    return ok({ sources: SUPPORTED_SOURCES });
}

export async function handleAuditRecent(args) {
    const limit = args?.limit != null ? validateInteger(args.limit, 'limit', { min: 1, max: MAX_AUDIT_LIMIT }) : 10;
    const path = process.env.PAPERVAULT_AUDIT_LOG || join(homedir(), '.papervault', 'audit.log');
    let raw;
    try {
        raw = await readFile(path, 'utf8');
    } catch (err) {
        if (err.code === 'ENOENT') return ok({ entries: [], note: 'audit log does not exist yet.' });
        return fail(`could not read audit log: ${err.message}`);
    }
    const lines = raw.trim().split('\n').filter(Boolean);
    const recent = lines.slice(-limit).map(l => {
        try { return JSON.parse(l); }
        catch { return { raw: l, parseError: true }; }
    });
    return ok({ entries: recent, total_entries: lines.length, returned: recent.length });
}

export async function handleDryRun(args) {
    const sourceUri = validateString(args?.source_uri, 'source_uri', { maxLength: 500 });
    const maxSecrets = args?.max_secrets != null
        ? validateInteger(args.max_secrets, 'max_secrets', { min: 1, max: HARD_MAX_SECRETS })
        : HARD_MAX_SECRETS;
    const selectStr = args?.select != null ? validateString(args.select, 'select', { maxLength: 500 }) : '';

    let src;
    try {
        src = resolveSource(sourceUri);
        await src.authenticate();
    } catch (err) {
        await audit({ action: 'mcp.dry_run', sourceUri, outcome: 'failed', error: err.message });
        return fail(`source error: ${err.message}`);
    }

    try {
        const allRefs = await src.list();
        const filter = makeGlobFilter(selectStr);
        const selectedRefs = allRefs.filter(r => filter(r.name));

        if (selectedRefs.length > maxSecrets) {
            await src.close();
            await audit({
                action: 'mcp.dry_run',
                sourceUri,
                secretCount: selectedRefs.length,
                outcome: 'refused',
                reason: 'exceeds max_secrets',
            });
            return fail(
                `selection has ${selectedRefs.length} secrets; max_secrets is ${maxSecrets}.`,
                { selected: selectedRefs.length, max_secrets: maxSecrets },
            );
        }

        const names = selectedRefs.map(r => r.name);
        const fp = fingerprint(names);
        await src.close();
        await audit({
            action: 'mcp.dry_run',
            sourceUri,
            secretCount: selectedRefs.length,
            secretNames: names,  // hashed by audit() unless PAPERVAULT_LOG_NAMES=1
            outcome: 'success',
        });

        return ok({
            source_uri: sourceUri,
            secret_count: selectedRefs.length,
            name_fingerprint: fp,
            kinds_summary: summarizeKinds(selectedRefs),
            note: 'Run papervault_backup_from_source with the same source_uri and select to commit. ' +
                'Compare name_fingerprint between runs to confirm the same set of secrets.',
        });
    } catch (err) {
        try { await src.close(); } catch {}
        await audit({ action: 'mcp.dry_run', sourceUri, outcome: 'failed', error: err.message });
        return fail(`dry_run failed: ${err.message}`);
    }
}

function summarizeKinds(refs) {
    const counts = {};
    for (const r of refs) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
    return counts;
}

export async function handleBackupFromSource(args) {
    // --- Input validation, all aggressive ---
    const sourceUri = validateString(args?.source_uri, 'source_uri', { maxLength: 500 });
    const shares    = validateInteger(args?.shares,    'shares',    { min: 1, max: HARD_MAX_SHARES });
    const threshold = validateInteger(args?.threshold, 'threshold', { min: 1, max: shares });
    if (shares > 1 && threshold < 2) {
        return fail('threshold must be >= 2 when shares > 1 (Shamir constraint).');
    }
    const savePath = validateSavePath(args?.save_path);
    const maxSecrets = args?.max_secrets != null
        ? validateInteger(args.max_secrets, 'max_secrets', { min: 1, max: HARD_MAX_SECRETS })
        : HARD_MAX_SECRETS;
    const vaultNameInput = args?.vault_name != null ? validateString(args.vault_name, 'vault_name', { maxLength: 100 }) : null;
    const selectStr = args?.select != null ? validateString(args.select, 'select', { maxLength: 500 }) : '';
    const names = validateNames(args?.names, shares);

    let src;
    try {
        src = resolveSource(sourceUri);
        await src.authenticate();
    } catch (err) {
        await audit({ action: 'mcp.backup', sourceUri, outcome: 'failed', error: err.message });
        return fail(`source error: ${err.message}`);
    }

    try {
        const allRefs = await src.list();
        const filter = makeGlobFilter(selectStr);
        const selectedRefs = allRefs.filter(r => filter(r.name));

        if (selectedRefs.length === 0) {
            await src.close();
            await audit({ action: 'mcp.backup', sourceUri, secretCount: 0, outcome: 'refused', reason: 'no selection' });
            return fail('no secrets matched the selection.');
        }
        if (selectedRefs.length > maxSecrets) {
            await src.close();
            await audit({
                action: 'mcp.backup',
                sourceUri,
                secretCount: selectedRefs.length,
                outcome: 'refused',
                reason: 'exceeds max_secrets',
            });
            return fail(
                `selection has ${selectedRefs.length} secrets; max_secrets is ${maxSecrets}. ` +
                'Tighten select, raise max_secrets (capped at ' + HARD_MAX_SECRETS + '), or split into ' +
                'multiple backups.',
                { selected: selectedRefs.length, max_secrets: maxSecrets },
            );
        }

        // --- Phase 2: fetch values ---
        const doc = await src.fetch(selectedRefs);
        const vaultName = vaultNameInput ?? doc.vaultName ?? 'Disaster Recovery Kit';

        const kit = await createKit({
            secrets: doc.secrets,
            freeText: doc.freeText,
            vaultName,
            threshold,
            shares,
            custodianNames: names,
        });

        // --- Write to disk with restrictive permissions ---
        const kitDir = join(savePath, `vault-${kit.vaultId}`);
        await mkdir(kitDir, { recursive: true });
        const filenames = [];
        for (const page of kit.pages) {
            // Strip the auto-print script — saved files don't auto-trigger print.
            const html = page.html.replace(/<script>window\.addEventListener\('load',.*?<\/script>/g, '');
            const filePath = join(kitDir, `${page.filename}.html`);
            await writeFile(filePath, html, { mode: 0o600 });
            try { await chmod(filePath, 0o600); } catch {} // belt + suspenders for restrictive umask
            filenames.push(`${page.filename}.html`);
        }

        const nameFingerprint = fingerprint(selectedRefs.map(r => r.name));
        await audit({
            action: 'mcp.backup',
            sourceUri,
            secretCount: selectedRefs.length,
            secretNames: selectedRefs.map(r => r.name),
            threshold,
            shares,
            vaultId: kit.vaultId,
            savedTo: kitDir,
            outcome: 'success',
        });

        await src.close();

        return ok({
            vault_id: kit.vaultId,
            vault_name: vaultName,
            save_dir: kitDir,
            files: filenames,
            secret_count: selectedRefs.length,
            name_fingerprint: nameFingerprint,
            shares,
            threshold,
            key_aliases: kit.keyAliases,
            note: 'Open the HTML files in a browser and print, or hand them to a human to print and ' +
                'distribute. Each file has mode 0600 (user-only readable).',
        });
    } catch (err) {
        try { await src.close(); } catch {}
        await audit({ action: 'mcp.backup', sourceUri, outcome: 'failed', error: err.message });
        return fail(`backup failed: ${err.message}`);
    }
}
