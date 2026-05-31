// Source URI dispatcher. New backends register here.

import { createFileSource } from './file.js';
import { createStdinSource } from './stdin.js';
import { createAzureKVSource } from './azure.js';

export function resolveSource(uri) {
    if (uri === '-' || uri === 'stdin' || uri === 'stdin://') {
        return createStdinSource();
    }
    if (uri.startsWith('file://')) {
        return createFileSource(uri.slice('file://'.length));
    }
    if (uri.startsWith('azure-kv://')) {
        const rest = uri.slice('azure-kv://'.length);
        // Allow ?host=... in the future; for MVP everything after / is ignored.
        const [vaultName] = rest.split(/[/?#]/, 1);
        if (!vaultName) {
            throw new Error('azure-kv: URI must include a vault name, e.g. azure-kv://my-vault');
        }
        return createAzureKVSource(vaultName);
    }
    // Other cloud adapters: not yet implemented.
    if (uri.startsWith('aws-sm://')   || uri.startsWith('gcp-sm://')  ||
        uri.startsWith('vault://')    || uri.startsWith('1password://')) {
        throw new Error(`Source "${uri.split('://')[0]}" is on the roadmap but not yet implemented. ` +
            `Use file://path/to/secrets.json, pipe JSON to stdin, or use azure-kv:// for now.`);
    }
    throw new Error(`Unknown source URI: ${uri}. Supported: file://, stdin (-), azure-kv://.`);
}

export const SUPPORTED_SOURCES = [
    { scheme: 'file://',       status: 'ready',   description: 'JSON file on local disk' },
    { scheme: 'stdin (-)',     status: 'ready',   description: 'JSON piped via stdin' },
    { scheme: 'azure-kv://',   status: 'ready',   description: 'Azure Key Vault (uses `az login` cache)' },
    { scheme: 'aws-sm://',     status: 'roadmap', description: 'AWS Secrets Manager' },
    { scheme: 'gcp-sm://',     status: 'roadmap', description: 'GCP Secret Manager' },
    { scheme: 'vault://',      status: 'roadmap', description: 'HashiCorp Vault' },
    { scheme: '1password://',  status: 'roadmap', description: '1Password' },
];
