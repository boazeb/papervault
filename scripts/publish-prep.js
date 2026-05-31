#!/usr/bin/env node
// Publish prep for the PaperVault package suite.
//
// Modes:
//   prepare <version>    Bump all four package.jsons to <version> and swap
//                        internal `file:` deps to `^<version>`. Validates
//                        LICENSE/README presence and publishConfig.
//   restore              Swap internal deps back to `file:` for local dev.
//   status               Show current versions + whether each internal dep
//                        is using `file:` or a version range.
//   pack-check           Run `npm pack --dry-run` in each package and
//                        list what would be included in the published tarball.
//
// Run from anywhere; the script resolves package dirs relative to its own
// location (../papervault-* siblings).

import { readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// Publish order matters — npm install reads deps in this order during testing.
// core → cli → (mcp, init), since mcp depends on both core+cli and init depends on cli.
const PACKAGES = [
    { name: '@papervault/core', dir: 'papervault-core' },
    { name: '@papervault/cli',  dir: 'papervault-cli'  },
    { name: '@papervault/mcp',  dir: 'papervault-mcp'  },
    { name: '@papervault/init', dir: 'papervault-init' },
];

const INTERNAL_NAMES = new Set(PACKAGES.map(p => p.name));

async function readPkg(dir) {
    const path = join(ROOT, dir, 'package.json');
    return { path, json: JSON.parse(await readFile(path, 'utf8')) };
}

async function writePkg(path, json) {
    await writeFile(path, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

async function fileExists(p) {
    try { await access(p); return true; } catch { return false; }
}

function isFileDep(value) {
    return typeof value === 'string' && value.startsWith('file:');
}

function dirForName(name) {
    return PACKAGES.find(p => p.name === name)?.dir;
}

// ---------- prepare ----------

async function cmdPrepare(version) {
    if (!version || !/^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$/.test(version)) {
        die(`prepare: version must be semver like 0.1.0 or 0.1.0-beta.1 (got "${version}")`);
    }
    console.log(`Preparing v${version} across ${PACKAGES.length} packages…\n`);

    for (const p of PACKAGES) {
        const { path, json } = await readPkg(p.dir);

        // Validate basic publish requirements first — fail fast before any writes.
        const errors = [];
        if (json.private) errors.push('package.json has "private": true');
        if (!json.license) errors.push('missing "license"');
        if (json.publishConfig?.access !== 'public') errors.push('missing publishConfig.access = "public"');
        if (!Array.isArray(json.files) || json.files.length === 0) errors.push('missing "files" whitelist');
        if (!await fileExists(join(ROOT, p.dir, 'LICENSE'))) errors.push('missing LICENSE file');
        if (!await fileExists(join(ROOT, p.dir, 'README.md'))) errors.push('missing README.md');
        if (errors.length > 0) die(`${p.name}:\n  - ${errors.join('\n  - ')}`);

        // Bump version
        const previousVersion = json.version;
        json.version = version;

        // Swap file: deps to ^version
        const swapped = [];
        for (const depGroup of ['dependencies', 'devDependencies', 'peerDependencies']) {
            const deps = json[depGroup];
            if (!deps) continue;
            for (const [name, value] of Object.entries(deps)) {
                if (INTERNAL_NAMES.has(name) && isFileDep(value)) {
                    deps[name] = `^${version}`;
                    swapped.push(name);
                }
            }
        }

        await writePkg(path, json);
        console.log(`  ✓ ${p.name.padEnd(20)} ${previousVersion} → ${version}` +
            (swapped.length > 0 ? `  (swapped: ${swapped.join(', ')})` : ''));
    }

    console.log('\nNext steps:');
    console.log('  1. Review the diffs:');
    console.log('       git -C /path/to/repo diff papervault-*/package.json');
    console.log('  2. Login to npm if needed:');
    console.log('       npm login');
    console.log('  3. Publish in dependency order:');
    for (const p of PACKAGES) {
        console.log(`       (cd ${p.dir} && npm publish)`);
    }
    console.log('  4. After all publish succeed, tag the release:');
    console.log(`       git tag v${version} && git push --tags`);
    console.log('  5. Restore file: deps for continued dev:');
    console.log('       node scripts/publish-prep.js restore');
}

// ---------- restore ----------

async function cmdRestore() {
    console.log('Restoring file: deps for local development…\n');
    for (const p of PACKAGES) {
        const { path, json } = await readPkg(p.dir);
        const swapped = [];
        for (const depGroup of ['dependencies', 'devDependencies', 'peerDependencies']) {
            const deps = json[depGroup];
            if (!deps) continue;
            for (const name of Object.keys(deps)) {
                if (!INTERNAL_NAMES.has(name)) continue;
                if (isFileDep(deps[name])) continue;
                const targetDir = dirForName(name);
                deps[name] = `file:../${targetDir}`;
                swapped.push(name);
            }
        }
        if (swapped.length > 0) {
            await writePkg(path, json);
            console.log(`  ✓ ${p.name.padEnd(20)} restored: ${swapped.join(', ')}`);
        } else {
            console.log(`  - ${p.name.padEnd(20)} no swaps needed`);
        }
    }
    console.log('\nRun `npm install` in each modified package to refresh the symlinks.');
}

// ---------- status ----------

async function cmdStatus() {
    console.log(`${'package'.padEnd(22)} ${'version'.padEnd(10)} internal deps`);
    console.log(`${'-'.repeat(22)} ${'-'.repeat(10)} ${'-'.repeat(40)}`);
    for (const p of PACKAGES) {
        const { json } = await readPkg(p.dir);
        const deps = Object.entries(json.dependencies ?? {})
            .filter(([n]) => INTERNAL_NAMES.has(n))
            .map(([n, v]) => `${n.replace('@papervault/', '')}=${v.startsWith('file:') ? 'file:' : v}`);
        console.log(`${p.name.padEnd(22)} ${json.version.padEnd(10)} ${deps.join(', ') || '(none)'}`);
    }
}

// ---------- pack-check ----------

async function cmdPackCheck() {
    for (const p of PACKAGES) {
        console.log(`\n=== ${p.name} ===`);
        await new Promise((resolveProm, rejectProm) => {
            const child = spawn('npm', ['pack', '--dry-run', '--json'], {
                cwd: join(ROOT, p.dir),
                stdio: ['ignore', 'pipe', 'inherit'],
            });
            let out = '';
            child.stdout.on('data', d => { out += d; });
            child.on('close', code => {
                if (code !== 0) return rejectProm(new Error(`npm pack failed (exit ${code})`));
                try {
                    const [result] = JSON.parse(out);
                    console.log(`  filename:  ${result.filename}`);
                    console.log(`  size:      ${(result.size / 1024).toFixed(1)} KB  (${result.unpackedSize ? (result.unpackedSize / 1024).toFixed(1) + ' KB unpacked' : '?'})`);
                    console.log(`  files:     ${result.files.length}`);
                    for (const f of result.files.slice(0, 20)) {
                        console.log(`    ${f.path}  (${f.size}B)`);
                    }
                    if (result.files.length > 20) {
                        console.log(`    … ${result.files.length - 20} more`);
                    }
                    resolveProm();
                } catch (err) {
                    rejectProm(err);
                }
            });
            child.on('error', rejectProm);
        });
    }
}

// ---------- main ----------

function die(msg) {
    process.stderr.write(`publish-prep: ${msg}\n`);
    process.exit(1);
}

const [mode, ...rest] = process.argv.slice(2);
try {
    switch (mode) {
        case 'prepare':     await cmdPrepare(rest[0]);  break;
        case 'restore':     await cmdRestore();         break;
        case 'status':      await cmdStatus();          break;
        case 'pack-check':  await cmdPackCheck();       break;
        default:
            process.stdout.write(
                'Usage:\n' +
                '  publish-prep.js prepare <version>   bump versions + swap file: deps to ^version\n' +
                '  publish-prep.js restore             swap deps back to file: for local dev\n' +
                '  publish-prep.js status              show current versions and dep types\n' +
                '  publish-prep.js pack-check          dry-run npm pack to inspect tarball contents\n'
            );
            process.exit(mode ? 2 : 0);
    }
} catch (err) {
    die(err.message);
}
