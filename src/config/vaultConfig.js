export const CURRENT_VAULT_VERSION = '2';

export const VAULT_VERSIONS = {
    '1': {
        algorithm: 'AES-256-CTR',
        kdf: 'PBKDF2',
    },
    '2': {
        algorithm: 'AES-256-GCM',
        kdf: 'none',
    }
};