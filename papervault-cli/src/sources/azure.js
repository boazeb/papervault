// Azure Key Vault adapter.
//
// Auth strategy: ride the platform's existing credential cache. We never call
// the Azure login flow ourselves — if the user hasn't run `az login` (or set
// AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET), we throw with a
// clear hint. Same posture as the kit pipeline itself: we're a conduit, not
// a credential store.
//
// URI shape: azure-kv://<vault-name>
//   The host part is the KV name; resolved to https://<name>.vault.azure.net.
//   We don't support custom URLs (private endpoints) in the MVP — easy to add
//   later via azure-kv://<name>?host=<custom>.
//
// Mapping: every KV secret becomes one PaperVault `apikey` entry with
//   service = secret name, key = value, notes = contentType (if set).
//   Tags are dropped for now to keep payload small. The kind defaults to
//   apikey because that's what most KV secrets are; users who want different
//   kinds per secret can pre-export to file:// and edit.
//
// Allowed-by-default: only the secret's LATEST enabled version. Disabled and
//   expired secrets are skipped (logged to stderr).

let cachedSDK = null;

async function loadAzureSDK(override) {
    // Tests can inject a fake SDK via opts.sdkOverride to avoid a real
    // network round-trip. Production path lazy-imports the real packages so
    // users who never touch Azure don't pay the require-time cost.
    if (override) return override;
    if (!cachedSDK) {
        const kv = await import('@azure/keyvault-secrets');
        const id = await import('@azure/identity');
        cachedSDK = {
            SecretClient: kv.SecretClient,
            DefaultAzureCredential: id.DefaultAzureCredential,
            AzureCliCredential: id.AzureCliCredential,
            ChainedTokenCredential: id.ChainedTokenCredential,
        };
    }
    return cachedSDK;
}

const KV_NAME_RE = /^[a-zA-Z0-9-]{3,24}$/;

export function createAzureKVSource(vaultName, opts = {}) {
    if (!KV_NAME_RE.test(vaultName)) {
        throw new Error(
            `azure-kv: vault name "${vaultName}" is invalid. ` +
            `Key Vault names are 3-24 chars of letters, digits, and dashes.`
        );
    }

    const host = opts.host || `${vaultName}.vault.azure.net`;
    const vaultUrl = `https://${host}`;
    let client = null;
    let propsCache = null;

    return {
        uri: `azure-kv://${vaultName}`,

        async authenticate() {
            const sdk = await loadAzureSDK(opts.sdkOverride);
            // Prefer the Azure CLI cache first — it's what a developer on a
            // laptop almost always has set up. Fall back to the rest of the
            // default chain (env vars, managed identity, etc.) for CI / VM use.
            const credential = new sdk.ChainedTokenCredential(
                new sdk.AzureCliCredential(),
                new sdk.DefaultAzureCredential(),
            );
            client = new sdk.SecretClient(vaultUrl, credential);

            // Probe: try to fetch the first page of secret properties. This
            // exercises both the credential and the data-plane permissions.
            try {
                const iter = client.listPropertiesOfSecrets().byPage({ maxPageSize: 1 });
                await iter.next();
            } catch (err) {
                client = null;
                throw new Error(
                    `Azure KV authentication / permission check failed for ${vaultUrl}.\n` +
                    `Tried: AzureCliCredential, then DefaultAzureCredential.\n` +
                    `Hint: run 'az login' (and 'az account set --subscription <id>' if needed), or set\n` +
                    `      AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET for a service principal.\n` +
                    `Hint: confirm your identity has 'Key Vault Secrets User' (or get/list) on this vault.\n` +
                    `Underlying: ${err.message ?? err}`
                );
            }
        },

        async list() {
            if (!client) throw new Error('azure-kv: authenticate() must be called first');
            const refs = [];
            const skipped = [];
            // listPropertiesOfSecrets returns each secret's LATEST version's
            // properties, which is what we want. Disabled or expired secrets
            // are filtered out (with a stderr note so the user knows).
            for await (const p of client.listPropertiesOfSecrets()) {
                const enabled = p.enabled !== false;
                const expired = p.expiresOn && p.expiresOn.getTime() < Date.now();
                if (!enabled) { skipped.push(`${p.name} (disabled)`); continue; }
                if (expired) { skipped.push(`${p.name} (expired)`);  continue; }
                refs.push({ name: p.name, kind: 'apikey' });
                // Stash properties for fetch() so we don't list twice.
                propsCache ??= new Map();
                propsCache.set(p.name, p);
            }
            if (skipped.length > 0) {
                process.stderr.write(`azure-kv: skipped ${skipped.length} secret(s): ${skipped.join(', ')}\n`);
            }
            return refs;
        },

        async fetch(refs) {
            if (!client) throw new Error('azure-kv: authenticate() must be called first');

            // If the caller didn't pre-filter, fetch metadata for everything.
            if (!refs) {
                refs = await this.list();
            }

            const secrets = [];
            for (const r of refs) {
                let val;
                try {
                    val = await client.getSecret(r.name);
                } catch (err) {
                    throw new Error(`azure-kv: failed to fetch secret "${r.name}" — ${err.message ?? err}`);
                }
                const contentType = val.properties?.contentType;
                secrets.push({
                    kind: 'apikey',
                    service: r.name,
                    key: val.value,
                    secret: '',
                    notes: contentType ? `contentType: ${contentType}` : '',
                });
            }
            return {
                vaultName: `Azure KV: ${vaultName}`,
                secrets,
            };
        },

        async close() {
            // Drop SDK refs so the credential can release any cached tokens
            // and the secret values fall out of the closure.
            client = null;
            propsCache = null;
        },
    };
}
