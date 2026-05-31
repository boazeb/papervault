// Mirrors papervault/src/config/limits.js and vaultConfig.js
// Kept in sync manually for now; future: extract a single source of truth.

export const VAULT_VERSION = '2';

export const LIMITS = {
    MAX_KEYS: 20,
    MAX_STORAGE: 300,
    MAX_QR_PAYLOAD_BYTES: 100 * 1024,
};

export const GCM_NONCE_BYTES = 12;
export const KEY_BYTES = 32;
export const MAX_CIPHERTEXT_HEX_LENGTH = 2 * 1024 * 1024;

export const HEX_REGEX = /^[0-9a-fA-F]+$/;

// Sentinel used in the vault QR `vault` field — matches what papervault.xyz expects.
export const VAULT_IDENT = 'papervault.xyz';
