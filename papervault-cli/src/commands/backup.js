import { parseArgs } from 'node:util';
import * as clack from '@clack/prompts';
import { LIMITS } from '@papervault/core';
import { resolveSource } from '../sources/index.js';
import { audit } from '../audit.js';
import { readConfig, CONFIG_FILENAME } from '../config.js';
import { runKitFlow } from '../kit-runner.js';

const HELP = `papervault backup — generate a printable disaster-recovery kit

Usage:
  papervault backup [options]

Source (one of):
  --source <uri>         file://<path>, azure-kv://<vault-name>, or - for stdin.
                         Falls back to ${CONFIG_FILENAME}.source if present, then stdin.
                         Azure uses your 'az login' cache (no creds handled by us).
                         Other clouds (AWS Secrets Manager, GCP Secret Manager,
                         HashiCorp Vault, 1Password) are on the roadmap.

Required:
  --threshold N          Minimum keys required to unlock the vault
  --shares N             Total number of key shares to generate

Optional:
  --name <text>          Vault name shown on the printed kit
  --select <glob,glob>   Filter source secrets by glob pattern (comma-separated)
  --interactive          After listing+filtering, show a multiselect so you can
                         narrow the picks before fetching values. Useful for
                         cloud sources with many entries. Implies --no-yes.
  --names <a,b,c>        Custodian names per share (e.g. "alice,bob,carol")
  --max-secrets N        Hard cap on number of secrets (default 20)
  --save <dir>           Also write HTML files to <dir>/vault-<id>/
  --no-print             Skip the ephemeral print server (only useful with --save)
  --yes                  Skip interactive confirmation (use in scripts)
  --dry-run              List what would be backed up, then exit
  --no-config            Ignore ${CONFIG_FILENAME} in the current directory
  --help

Config: if ${CONFIG_FILENAME} exists in the current directory, its values
are used as defaults. CLI flags override config. Run \`papervault init\` to
create one interactively.

Defaults: ephemeral print server, no disk writes.
`;

const OPTIONS = {
    source:        { type: 'string' },
    threshold:     { type: 'string' },
    shares:        { type: 'string' },
    name:          { type: 'string' },
    select:        { type: 'string' },
    interactive:   { type: 'boolean' },
    names:         { type: 'string' },
    'max-secrets': { type: 'string' },
    save:          { type: 'string' },
    'no-print':    { type: 'boolean' },
    yes:           { type: 'boolean' },
    'dry-run':     { type: 'boolean' },
    'no-config':   { type: 'boolean' },
    help:          { type: 'boolean' },
};

function globToRegex(g) {
    const parts = g.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp('^' + parts.join('.*') + '$');
}

export async function backup(argv) {
    const { values } = parseArgs({ args: argv, options: OPTIONS, allowPositionals: false });

    if (values.help) {
        process.stdout.write(HELP);
        return;
    }

    // Layer 1: file config (if present + not --no-config)
    let cfg = null;
    if (!values['no-config']) {
        try { cfg = await readConfig(); }
        catch (err) { process.stderr.write(`Warning: ${err.message}\n`); }
        if (cfg) process.stderr.write(`Using ${CONFIG_FILENAME} (CLI flags override).\n`);
    }

    // Layer 2: CLI flags override config. Falls back to stdin if nothing set.
    const threshold = Number(values.threshold ?? cfg?.threshold);
    const shares    = Number(values.shares    ?? cfg?.shares);
    if (!Number.isInteger(threshold) || !Number.isInteger(shares)) {
        throw new Error('--threshold and --shares are required (or set them in ' + CONFIG_FILENAME + '). See --help.');
    }

    const maxSecrets = Number(values['max-secrets'] ?? cfg?.maxSecrets ?? 20);
    if (!Number.isInteger(maxSecrets) || maxSecrets < 1 || maxSecrets > LIMITS.MAX_KEYS * 5) {
        throw new Error('--max-secrets must be a positive integer.');
    }

    const sourceUri = values.source ?? cfg?.source ?? '-';
    const src = resolveSource(sourceUri);
    await src.authenticate();

    // Phase 1: list — see what would be backed up.
    const refs = await src.list();

    let selectedRefs = refs;
    const effectiveSelect = values.select ?? cfg?.select;
    if (effectiveSelect) {
        const patterns = effectiveSelect.split(',').map(s => globToRegex(s.trim()));
        selectedRefs = refs.filter(r => patterns.some(p => p.test(r.name)));
    }

    if (selectedRefs.length === 0) {
        throw new Error('No secrets matched the selection.');
    }

    // --interactive: let the user narrow down before we hit max_secrets or
    // fetch any values. Runs AFTER --select so the glob can pre-filter; the
    // multiselect picks from what's left.
    if (values.interactive) {
        const picked = await clack.multiselect({
            message: `Pick which to back up (${selectedRefs.length} match${selectedRefs.length === 1 ? '' : 'es'}):`,
            options: selectedRefs.map(r => ({ value: r.name, label: `${r.name} [${r.kind}]` })),
            required: true,
        });
        if (clack.isCancel(picked)) {
            process.stderr.write('Aborted.\n');
            await src.close();
            return;
        }
        const pickedSet = new Set(picked);
        selectedRefs = selectedRefs.filter(r => pickedSet.has(r.name));
    }

    if (selectedRefs.length > maxSecrets) {
        throw new Error(`${selectedRefs.length} secrets matched, but --max-secrets is ${maxSecrets}. ` +
            'Tighten --select, use --interactive to pick fewer, or raise --max-secrets explicitly.');
    }

    process.stderr.write(`Source: ${src.uri}\n`);
    process.stderr.write(`Selected ${selectedRefs.length} secret${selectedRefs.length === 1 ? '' : 's'}:\n`);
    for (const r of selectedRefs) {
        process.stderr.write(`  - ${r.name} [${r.kind}]\n`);
    }

    if (values['dry-run']) {
        await audit({
            action: 'backup.dryrun',
            sourceUri: src.uri,
            secretCount: selectedRefs.length,
            threshold, shares,
            secretNames: selectedRefs.map(r => r.name),
            outcome: 'success',
        });
        await src.close();
        return;
    }

    if (!values.yes) {
        process.stderr.write(`\nAbout to encrypt + split into ${shares} keys (threshold ${threshold}). ` +
            `Pass --yes to skip this confirmation.\nContinue? [y/N] `);
        const answer = await readOneLineFromStdin();
        if (!/^y(es)?$/i.test(answer.trim())) {
            process.stderr.write('Aborted.\n');
            await audit({
                action: 'backup',
                sourceUri: src.uri,
                secretCount: selectedRefs.length,
                threshold, shares,
                outcome: 'aborted',
            });
            await src.close();
            return;
        }
    }

    // Phase 2: fetch only the selected refs. Adapter has already filtered
    // for us, so doc.secrets is exactly what was asked for.
    const doc = await src.fetch(selectedRefs);
    const secrets = doc.secrets;

    const vaultName = values.name ?? cfg?.vaultName ?? doc.vaultName ?? 'Disaster Recovery Kit';
    const custodianNames = values.names
        ? values.names.split(',').map(s => s.trim())
        : (cfg?.custodianNames ?? undefined);
    if (custodianNames && custodianNames.length !== shares) {
        throw new Error(`names list has ${custodianNames.length} entries but shares is ${shares}.`);
    }

    let result;
    try {
        result = await runKitFlow({
            secrets,
            freeText: doc.freeText,
            vaultName,
            threshold,
            shares,
            custodianNames,
            savePath: values.save ?? cfg?.savePath,
            print: !values['no-print'],
        });
    } catch (err) {
        await audit({
            action: 'backup',
            sourceUri: src.uri,
            secretCount: selectedRefs.length,
            threshold, shares,
            outcome: 'failed',
            error: err.message,
        });
        await src.close();
        throw err;
    }
    await src.close();

    await audit({
        action: 'backup',
        sourceUri: src.uri,
        secretCount: selectedRefs.length,
        threshold, shares,
        vaultId: result.vaultId,
        savedTo: result.savedTo,
        printed: result.printed,
        outcome: 'success',
    });
}

function readOneLineFromStdin() {
    return new Promise(resolve => {
        let buf = '';
        const onData = (chunk) => {
            buf += chunk.toString('utf8');
            const nl = buf.indexOf('\n');
            if (nl >= 0) {
                process.stdin.off('data', onData);
                process.stdin.pause();
                resolve(buf.slice(0, nl));
            }
        };
        process.stdin.resume();
        process.stdin.on('data', onData);
    });
}
