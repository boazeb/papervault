// Interactive setup wizard.
//
// Two modes that diverge after the source pick:
//
//   1. "I'll add them now" / ".env file"  → one-shot mode
//        Collect secrets in memory → vault config prompts → runKitFlow.
//        No config file written. Secrets never persisted unless user
//        explicitly picks a save path.
//
//   2. Azure KV / JSON file / stdin       → recurring-source mode
//        Source URI + vault config → write papervault.config.json.
//        Subsequent `papervault backup` runs need zero flags.
//
// Secrets NEVER pass through the config file. For one-shot flows, the kit
// is generated immediately and the process exits.

import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import * as p from '@clack/prompts';
import { countUserContent, LIMITS } from '@papervault/core';

import { configPath, configExists, readConfig, writeConfig, CONFIG_FILENAME } from '../config.js';
import { resolveSource } from '../sources/index.js';
import { runKitFlow } from '../kit-runner.js';

const HELP = `papervault init — interactive setup

Walks through the choices and either:
  • Generates a kit right now (manual entry or .env import), or
  • Writes ${CONFIG_FILENAME} so subsequent 'papervault backup' runs need no flags.

Usage:
  papervault init [options]

Options:
  --force          Overwrite an existing ${CONFIG_FILENAME} without prompting
  --help
`;

const OPTIONS = {
    force: { type: 'boolean' },
    help:  { type: 'boolean' },
};

function expandTilde(s) {
    if (!s) return s;
    if (s === '~') return homedir();
    if (s.startsWith('~/')) return resolve(homedir(), s.slice(2));
    return s;
}

function cancelIf(value) {
    if (p.isCancel(value)) {
        p.cancel('Setup cancelled.');
        process.exit(0);
    }
    return value;
}

export async function init(argv) {
    const { values } = parseArgs({ args: argv, options: OPTIONS, allowPositionals: false });
    if (values.help) {
        process.stdout.write(HELP);
        return;
    }

    p.intro('🔐  PaperVault init');

    let prefill = null;
    if (configExists() && !values.force) {
        try { prefill = await readConfig(); } catch { /* fresh start */ }
        if (prefill) {
            const action = cancelIf(await p.select({
                message: `${CONFIG_FILENAME} already exists. What now?`,
                options: [
                    { value: 'edit',    label: 'Edit it (pre-fill answers from current values)' },
                    { value: 'replace', label: 'Start over from scratch' },
                    { value: 'cancel',  label: 'Cancel' },
                ],
            }));
            if (action === 'cancel') { p.cancel('Cancelled.'); return; }
            if (action === 'replace') prefill = null;
        }
    }

    // ---------- 1. Where are your secrets? ----------
    const sourceType = cancelIf(await p.select({
        message: 'Where are your secrets?',
        initialValue: prefill ? guessSourceType(prefill.source) : 'manual',
        options: [
            { value: 'manual',  label: "I'll add them now",        hint: 'interactive entry, nothing saved to disk' },
            { value: 'env',     label: 'Import from .env file',     hint: 'parses KEY=value lines' },
            { value: 'azure',   label: 'Azure Key Vault',           hint: 'uses your `az login` cache' },
            { value: 'file',    label: 'JSON file on disk',         hint: 'advanced — you maintain the file' },
            { value: 'stdin',   label: 'stdin pipe',                hint: 'for shell pipelines / scripts' },
            { value: 'roadmap', label: 'Something else…',           hint: 'aws-sm, gcp-sm, vault, 1password' },
        ],
    }));

    if (sourceType === 'roadmap') {
        p.log.info('Those backends are on the roadmap — file / stdin / Azure / manual / .env work today.');
        p.outro('No config written. Re-run init when you\'re ready.');
        return;
    }

    // ---------- One-shot modes: manual + .env ----------
    if (sourceType === 'manual') {
        const secrets = await collectManualSecrets();
        if (secrets.length === 0) { p.cancel('No secrets entered.'); return; }
        await oneShotKitFlow({ secrets, sourceLabel: 'manual entry' });
        return;
    }

    if (sourceType === 'env') {
        const secrets = await collectFromEnvFile();
        if (secrets.length === 0) { p.cancel('No secrets selected.'); return; }
        await oneShotKitFlow({ secrets, sourceLabel: '.env import' });
        return;
    }

    // ---------- Recurring-source modes: Azure / JSON / stdin ----------
    let sourceUri;
    // Set by the Azure flow's optional multiselect; gets persisted to the
    // generated config as `select`. Other source types don't populate it.
    let initSelect = null;
    if (sourceType === 'file') {
        const pth = cancelIf(await p.text({
            message: 'Path to the JSON file with your secrets:',
            placeholder: '/Users/you/secrets.json',
            initialValue: prefill?.source?.startsWith('file://') ? prefill.source.slice(7) : undefined,
            validate(v) {
                const expanded = expandTilde(v?.trim());
                if (!expanded) return 'Required.';
                if (!isAbsolute(expanded)) return 'Use an absolute path so `papervault backup` works from any directory.';
                if (!existsSync(expanded)) return `File not found: ${expanded}`;
            },
        }));
        sourceUri = `file://${expandTilde(pth.trim())}`;
    } else if (sourceType === 'stdin') {
        sourceUri = '-';
        p.log.info('Backups will read JSON from stdin — pipe your secrets each run.');
    } else if (sourceType === 'azure') {
        const vaultName = cancelIf(await p.text({
            message: 'Azure Key Vault name:',
            placeholder: 'my-vault',
            initialValue: prefill?.source?.startsWith('azure-kv://') ? prefill.source.slice('azure-kv://'.length) : undefined,
            validate(v) {
                if (!v) return 'Required.';
                if (!/^[a-zA-Z0-9-]{3,24}$/.test(v.trim())) return 'Vault names are 3-24 chars of letters, digits, and dashes.';
            },
        }));
        sourceUri = `azure-kv://${vaultName.trim()}`;

        const checkAuth = cancelIf(await p.confirm({
            message: 'Verify access to this vault now? (probes with `az login` cache)',
            initialValue: true,
        }));
        if (checkAuth) {
            const s = p.spinner();
            s.start(`Connecting to ${sourceUri}…`);
            let azureRefs = null;
            try {
                const src = resolveSource(sourceUri);
                await src.authenticate();
                azureRefs = await src.list();
                await src.close();
                s.stop(`Connected: ${azureRefs.length} secret${azureRefs.length === 1 ? '' : 's'} visible.`);
            } catch (err) {
                s.stop('Auth check failed.');
                p.log.warn(err.message.split('\n')[0]);
                const skip = cancelIf(await p.confirm({
                    message: 'Save the config anyway? (fix auth before the first backup)',
                    initialValue: true,
                }));
                if (!skip) { p.cancel('Aborted.'); return; }
            }

            // Multiselect which secrets the saved config should target.
            // Skip only if the listing failed or the KV is empty. Even 1
            // secret might be too big for the vault, so always offer the
            // choice when there's something to pick.
            if (azureRefs && azureRefs.length > 0) {
                p.log.info(
                    `Vaults cap at ${LIMITS.MAX_STORAGE} chars of user content total (so QR codes stay scannable). ` +
                    `Pick which secrets the backup should include — you can leave it empty to back up everything.`
                );
                const lowerBound = azureRefs.reduce((sum, r) => sum + r.name.length, 0);
                const roughEstimate = lowerBound + azureRefs.length * 60;
                if (roughEstimate > LIMITS.MAX_STORAGE) {
                    p.log.warn(
                        `Heads up: rough estimate is ${lowerBound}–${roughEstimate} chars across all ${azureRefs.length} secrets, ` +
                        `likely above the ${LIMITS.MAX_STORAGE} limit. Pick a subset below.`
                    );
                }
                // Pre-check what the existing config already selected so an
                // edit-mode init doesn't drop prior intent.
                const previouslySelected = prefill?.select
                    ? new Set(prefill.select.split(',').map(s => s.trim()).filter(Boolean))
                    : null;
                const initialValues = previouslySelected
                    ? azureRefs.map(r => r.name).filter(n => previouslySelected.has(n))
                    : undefined;
                const picked = cancelIf(await p.multiselect({
                    message: `Secrets to back up (none = all ${azureRefs.length}):`,
                    options: azureRefs.map(r => ({ value: r.name, label: r.name })),
                    initialValues,
                    required: false,
                }));
                if (picked.length > 0 && picked.length < azureRefs.length) {
                    initSelect = picked.join(',');
                    p.log.success(`Selected ${picked.length} of ${azureRefs.length}; saving as 'select' in the config.`);
                }
            }
        }
    }

    const cfg = await collectVaultConfig({ prefill, sourceUri, initSelect });
    p.note(formatConfigPreview(cfg), 'Config preview');

    const confirm = cancelIf(await p.confirm({
        message: `Write ${CONFIG_FILENAME} to ${configPath()}?`,
        initialValue: true,
    }));
    if (!confirm) { p.cancel('Nothing written.'); return; }

    const written = await writeConfig(cfg);
    p.log.success(`Wrote ${written}`);
    p.note(
        sourceType === 'stdin' ? 'cat secrets.json | papervault backup' : 'papervault backup',
        'Next: generate a kit'
    );
    p.outro('Done.');
}

// =====================================================================
// Manual entry
// =====================================================================

const KIND_FIELDS = {
    password: [
        { key: 'service',  label: 'Service / site',  required: true,  mask: false },
        { key: 'username', label: 'Username / email', required: false, mask: false },
        { key: 'password', label: 'Password',         required: true,  mask: true  },
        { key: 'url',      label: 'URL',              required: false, mask: false },
        { key: 'notes',    label: 'Notes',            required: false, mask: false },
    ],
    wallet: [
        { key: 'name',       label: 'Wallet name',    required: true,  mask: false },
        { key: 'seed',       label: 'Seed phrase',    required: false, mask: true  },
        { key: 'privateKey', label: 'Private key',    required: false, mask: true  },
        { key: 'address',    label: 'Address',        required: false, mask: false },
        { key: 'notes',      label: 'Notes',          required: false, mask: false },
    ],
    note: [
        { key: 'title',   label: 'Title',   required: true,  mask: false },
        { key: 'content', label: 'Content', required: true,  mask: false },
    ],
    apikey: [
        { key: 'service', label: 'Service',    required: true,  mask: false },
        { key: 'key',     label: 'API key',    required: true,  mask: true  },
        { key: 'secret',  label: 'API secret', required: false, mask: true  },
        { key: 'notes',   label: 'Notes',      required: false, mask: false },
    ],
    custom: [
        { key: 'label', label: 'Label', required: true,  mask: false },
        { key: 'value', label: 'Value', required: true,  mask: true  },
        { key: 'notes', label: 'Notes', required: false, mask: false },
    ],
};

async function collectManualSecrets() {
    const secrets = [];
    p.log.info(`Add secrets one at a time. The vault holds up to ${LIMITS.MAX_STORAGE} characters of content total (matches papervault.xyz so QR codes stay scannable).`);

    while (true) {
        const remaining = LIMITS.MAX_STORAGE - countUserContent(secrets);
        const counter = remaining >= 0 ? `${remaining} chars left` : `OVER by ${-remaining} chars`;

        const kind = cancelIf(await p.select({
            message: `Add a secret? (${secrets.length} so far · ${counter})`,
            options: [
                { value: 'password', label: 'Password',           hint: 'service + username + password + url + notes' },
                { value: 'wallet',   label: 'Wallet / seed',      hint: 'name + seed phrase / private key + address' },
                { value: 'apikey',   label: 'API key',            hint: 'service + key + secret' },
                { value: 'note',     label: 'Note',               hint: 'title + content' },
                { value: 'custom',   label: 'Custom',             hint: 'label + value + notes' },
                { value: 'done',     label: secrets.length === 0 ? 'Cancel' : 'Done — print my kit' },
            ],
        }));

        if (kind === 'done') break;

        const entry = { kind };
        let cancelled = false;
        for (const field of KIND_FIELDS[kind]) {
            const prompt = field.mask ? p.password : p.text;
            const ans = await prompt({
                message: `${field.label}${field.required ? '' : ' (optional)'}:`,
                validate(v) {
                    if (field.required && (!v || !v.trim())) return 'Required.';
                },
            });
            if (p.isCancel(ans)) { cancelled = true; break; }
            if (ans) entry[field.key] = ans.trim();
        }
        if (cancelled) {
            p.log.warn('Entry cancelled — skipping this one.');
            continue;
        }

        // Re-check limit AFTER adding this entry; reject if it tipped over.
        const trial = [...secrets, entry];
        const trialCount = countUserContent(trial);
        if (trialCount > LIMITS.MAX_STORAGE) {
            p.log.warn(`Adding this entry would push content to ${trialCount} chars (over the ${LIMITS.MAX_STORAGE} limit). Entry NOT added — shorten the values or remove an earlier entry.`);
            continue;
        }
        secrets.push(entry);
        p.log.success(`Added ${kind} (${trialCount}/${LIMITS.MAX_STORAGE} chars used).`);
    }

    return secrets;
}

// =====================================================================
// .env import
// =====================================================================

async function collectFromEnvFile() {
    const pth = cancelIf(await p.text({
        message: 'Path to .env file:',
        placeholder: '/Users/you/project/.env',
        validate(v) {
            const expanded = expandTilde(v?.trim());
            if (!expanded) return 'Required.';
            if (!isAbsolute(expanded)) return 'Use an absolute path.';
            if (!existsSync(expanded)) return `File not found: ${expanded}`;
        },
    }));
    const content = await readFile(expandTilde(pth.trim()), 'utf8');
    const parsed = parseEnvFile(content);

    if (parsed.length === 0) {
        p.log.warn('No KEY=value entries found in that file.');
        return [];
    }

    p.log.info(`Found ${parsed.length} entries in ${pth}. Pick which to back up — values will be visible in your terminal selection list as a single dot per item.`);

    // Multiselect: show name + truncated value as label
    const choices = parsed.map(e => ({
        value: e.service,
        label: `${e.service}`,
        hint: e.key.length > 20 ? `${e.key.slice(0, 20)}…` : e.key,
    }));

    const picked = cancelIf(await p.multiselect({
        message: `Select entries to back up (${LIMITS.MAX_STORAGE} chars max total):`,
        options: choices,
        required: false,
    }));

    const selected = parsed.filter(e => picked.includes(e.service));

    const totalChars = countUserContent(selected);
    if (totalChars > LIMITS.MAX_STORAGE) {
        p.log.error(`Selection is ${totalChars} chars — over the ${LIMITS.MAX_STORAGE} limit. Re-run init and pick fewer entries.`);
        return [];
    }
    if (totalChars > 0) {
        p.log.success(`${selected.length} selected, ${totalChars}/${LIMITS.MAX_STORAGE} chars.`);
    }
    return selected;
}

/**
 * Minimal .env parser. Handles:
 *   - blank lines and # comments
 *   - "export KEY=value" prefix
 *   - single- and double-quoted values
 *   - inline # comments after unquoted values
 * Each entry becomes a PaperVault `apikey` with service=name, key=value.
 */
export function parseEnvFile(content) {
    const out = [];
    for (const raw of content.split('\n')) {
        const line = raw.replace(/\r$/, '');
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const stripped = trimmed.replace(/^export\s+/, '');
        const eq = stripped.indexOf('=');
        if (eq < 1) continue;

        const key = stripped.slice(0, eq).trim();
        let value = stripped.slice(eq + 1);

        // Quoted values keep everything inside the quotes literal (incl. # and =).
        const dq = value.match(/^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/);
        const sq = value.match(/^'([^']*)'\s*(?:#.*)?$/);
        if (dq) value = dq[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        else if (sq) value = sq[1];
        else {
            // Unquoted: strip inline comments and trim.
            const hashIdx = value.indexOf(' #');
            if (hashIdx >= 0) value = value.slice(0, hashIdx);
            value = value.trim();
        }

        if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
        if (value === '') continue; // skip empty values
        out.push({ kind: 'apikey', service: key, key: value });
    }
    return out;
}

// =====================================================================
// Shared: vault config (shares, threshold, name, custodians, save path)
// =====================================================================

async function collectVaultConfig({ prefill, sourceUri, initSelect = null }) {
    const shares = Number(cancelIf(await p.text({
        message: 'How many key shares should the vault be split into?',
        placeholder: '3',
        initialValue: prefill?.shares != null ? String(prefill.shares) : '3',
        validate(v) {
            const n = Number(v);
            if (!Number.isInteger(n) || n < 1 || n > LIMITS.MAX_KEYS) return `Integer 1..${LIMITS.MAX_KEYS}.`;
        },
    })));

    let threshold;
    if (shares === 1) {
        threshold = 1;
        p.log.info('Single share → threshold is 1 (no Shamir split).');
    } else {
        threshold = Number(cancelIf(await p.text({
            message: `How many shares are needed to unlock? (2..${shares})`,
            placeholder: '2',
            initialValue: prefill?.threshold != null ? String(prefill.threshold) : String(Math.min(2, shares)),
            validate(v) {
                const n = Number(v);
                if (!Number.isInteger(n) || n < 2 || n > shares) return `Integer 2..${shares}.`;
            },
        })));
    }

    const vaultName = cancelIf(await p.text({
        message: 'Vault name (shown on the printed kit):',
        placeholder: 'Disaster Recovery Kit',
        initialValue: prefill?.vaultName ?? 'Disaster Recovery Kit',
        validate(v) { if (v && v.length > 100) return 'Keep it under 100 chars.'; },
    }));

    let custodianNames;
    if (shares > 1) {
        const useCustodians = cancelIf(await p.confirm({
            message: `Assign custodian names to the ${shares} shares?`,
            initialValue: prefill?.custodianNames != null,
        }));
        if (useCustodians) {
            const raw = cancelIf(await p.text({
                message: `Names (comma-separated, ${shares} total):`,
                placeholder: 'alice, bob, carol',
                initialValue: prefill?.custodianNames?.join(', '),
                validate(v) {
                    const parts = (v ?? '').split(',').map(s => s.trim()).filter(Boolean);
                    if (parts.length !== shares) return `Need exactly ${shares} names, got ${parts.length}.`;
                    if (parts.some(s => s.length > 60)) return 'Each name must be 60 chars or fewer.';
                },
            }));
            custodianNames = raw.split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    const useSavePath = cancelIf(await p.confirm({
        message: 'Set a default save path for printable kits?',
        initialValue: prefill?.savePath != null,
    }));
    let savePath;
    if (useSavePath) {
        savePath = expandTilde(cancelIf(await p.text({
            message: 'Default save path (kits go in <path>/vault-<id>/):',
            placeholder: '/Users/you/papervault-backups',
            initialValue: prefill?.savePath,
            validate(v) {
                const expanded = expandTilde(v?.trim());
                if (!expanded) return 'Required.';
                if (!isAbsolute(expanded)) return 'Use an absolute path.';
            },
        })).trim());
    }

    // Precedence: explicit user selection (from init's multiselect step) wins
    // over whatever was in the prefilled config. None of the prompts above ask
    // for `select`, so the only sources are initSelect or prefill.
    const effectiveSelect = initSelect ?? prefill?.select ?? null;

    return {
        source: sourceUri,
        threshold, shares, vaultName,
        ...(custodianNames    ? { custodianNames }       : {}),
        ...(savePath          ? { savePath }             : {}),
        ...(effectiveSelect   ? { select: effectiveSelect } : {}),
    };
}

function formatConfigPreview(cfg) {
    return [
        `source     ${cfg.source}`,
        `vault      ${cfg.vaultName}`,
        `unlock     ${cfg.threshold} of ${cfg.shares} shares`,
        cfg.select         ? `select     ${cfg.select}` : null,
        cfg.custodianNames ? `custodians ${cfg.custodianNames.join(', ')}` : null,
        cfg.savePath       ? `savePath   ${cfg.savePath}`                  : null,
    ].filter(Boolean).join('\n');
}

function guessSourceType(uri) {
    if (!uri) return 'manual';
    if (uri === '-' || uri.startsWith('stdin')) return 'stdin';
    if (uri.startsWith('file://')) return 'file';
    if (uri.startsWith('azure-kv://')) return 'azure';
    return 'manual';
}

// =====================================================================
// One-shot flow: collected secrets → vault config → kit → exit
// =====================================================================

async function oneShotKitFlow({ secrets, sourceLabel }) {
    p.log.info(`Configuring vault for ${secrets.length} secret${secrets.length === 1 ? '' : 's'} (${sourceLabel}).`);

    const cfg = await collectVaultConfig({ prefill: null, sourceUri: sourceLabel });

    const confirm = cancelIf(await p.confirm({
        message: `Generate the kit now? (opens print dialog${cfg.savePath ? ' + saves files' : ''})`,
        initialValue: true,
    }));
    if (!confirm) { p.cancel('Aborted. Secrets dropped, nothing written.'); return; }

    p.outro('Generating kit…');

    await runKitFlow({
        secrets,
        vaultName: cfg.vaultName,
        threshold: cfg.threshold,
        shares: cfg.shares,
        custodianNames: cfg.custodianNames,
        savePath: cfg.savePath,
        print: true,
    });
}
