// file:// adapter — reads a JSON document from disk.
// Expected schema (also see stdin adapter):
//   {
//     "vaultName": "string",            // optional, can be overridden by --name
//     "freeText": "string",              // optional
//     "secrets": [
//       {"kind": "password", "name": "...", "username": "...", "value": "...", "notes": "..."},
//       {"kind": "wallet",   "name": "...", "seed": "...", "address": "..."},
//       {"kind": "note",     "title": "...", "content": "..."},
//       {"kind": "apikey",   "service": "...", "key": "...", "secret": "..."},
//       {"kind": "custom",   "label": "...", "value": "..."}
//     ]
//   }

import { readFile } from 'node:fs/promises';

function refName(s) {
    return s.name ?? s.label ?? s.service ?? s.title ?? '<unnamed>';
}

export function createFileSource(pathFromUri) {
    return {
        uri: `file://${pathFromUri}`,
        async authenticate() { /* no auth */ },
        async list() {
            const doc = await readDoc(pathFromUri);
            return doc.secrets.map(s => ({ name: refName(s), kind: s.kind }));
        },
        async fetch(refs) {
            // file:// already loaded everything; filter to the selected refs
            // so the caller can trust doc.secrets matches what they asked for.
            const doc = await readDoc(pathFromUri);
            if (!refs) return doc;
            const wanted = new Set(refs.map(r => r.name));
            return { ...doc, secrets: doc.secrets.filter(s => wanted.has(refName(s))) };
        },
        async close() { /* nothing to clear */ },
    };
}

async function readDoc(path) {
    let raw;
    try {
        raw = await readFile(path, 'utf8');
    } catch (err) {
        throw new Error(`file source: cannot read "${path}" — ${err.message}`);
    }
    let doc;
    try {
        doc = JSON.parse(raw);
    } catch (err) {
        throw new Error(`file source: invalid JSON in "${path}" — ${err.message}`);
    }
    if (!doc || !Array.isArray(doc.secrets)) {
        throw new Error('file source: JSON must have a "secrets" array.');
    }
    return doc;
}
