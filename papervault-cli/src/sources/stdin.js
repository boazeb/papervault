// stdin adapter — same JSON schema as file://, read from process.stdin.
// Used when source URI is "-".

function refName(s) {
    return s.name ?? s.label ?? s.service ?? s.title ?? '<unnamed>';
}

export function createStdinSource() {
    let cached = null;
    return {
        uri: 'stdin',
        async authenticate() {},
        async list() {
            const doc = await readOnce();
            return doc.secrets.map(s => ({ name: refName(s), kind: s.kind }));
        },
        async fetch(refs) {
            const doc = await readOnce();
            if (!refs) return doc;
            const wanted = new Set(refs.map(r => r.name));
            return { ...doc, secrets: doc.secrets.filter(s => wanted.has(refName(s))) };
        },
        async close() { cached = null; },
    };

    async function readOnce() {
        if (cached) return cached;
        const chunks = [];
        for await (const chunk of process.stdin) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw.trim()) {
            throw new Error('stdin source: no input received.');
        }
        let doc;
        try {
            doc = JSON.parse(raw);
        } catch (err) {
            throw new Error(`stdin source: invalid JSON — ${err.message}`);
        }
        if (!doc || !Array.isArray(doc.secrets)) {
            throw new Error('stdin source: JSON must have a "secrets" array.');
        }
        cached = doc;
        return doc;
    }
}
