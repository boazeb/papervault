// V2 crypto only: AES-256-GCM via WebCrypto + Shamir Secret Sharing.
// Extracted from papervault/src/services/EncryptionService.js.
// Node 24.x exposes globalThis.crypto with WebCrypto subtle support.

import { split as shamirSplit, combine as shamirCombine } from 'shamir-secret-sharing';
import bip39 from 'bip39';
import {
    GCM_NONCE_BYTES,
    KEY_BYTES,
    MAX_CIPHERTEXT_HEX_LENGTH,
    HEX_REGEX,
    LIMITS,
} from './constants.js';

const subtle = globalThis.crypto?.subtle;
if (!subtle) {
    throw new Error('@papervault/core requires Node 24+ with WebCrypto (globalThis.crypto.subtle).');
}

export function secureRandomBytes(length) {
    if (!globalThis.crypto?.getRandomValues) {
        throw new Error('secureRandomBytes: crypto.getRandomValues is not available.');
    }
    return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

export function hexToUint8Array(hex) {
    if (typeof hex !== 'string' || hex.length % 2 !== 0) {
        throw new Error('hexToUint8Array: hex string must have even length.');
    }
    const len = hex.length / 2;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

export function uint8ArrayToHex(arr) {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function validateHexInput(value, label, exactBytes, maxHexLength) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Invalid ${label}: must be a non-empty hex string.`);
    }
    if (!HEX_REGEX.test(value)) {
        throw new Error(`Invalid ${label}: not a valid hex string.`);
    }
    if (value.length % 2 !== 0) {
        throw new Error(`Invalid ${label}: hex string must have even length.`);
    }
    if (exactBytes != null) {
        const expectedLen = exactBytes * 2;
        if (value.length !== expectedLen) {
            throw new Error(`Invalid ${label}: expected ${exactBytes} bytes, got ${value.length / 2}.`);
        }
    }
    if (maxHexLength != null && value.length > maxHexLength) {
        throw new Error(`Invalid ${label}: exceeds maximum allowed size.`);
    }
}

/**
 * Encrypt a UTF-8 string with a freshly-generated AES-256-GCM key + nonce.
 * Returns { cipherText, cipherKey, cipherIV, version } — all hex strings.
 */
export async function encrypt(plaintext) {
    if (typeof plaintext !== 'string') {
        throw new Error('encrypt: plaintext must be a string.');
    }
    const keyBytes = secureRandomBytes(KEY_BYTES);
    const nonce = secureRandomBytes(GCM_NONCE_BYTES);
    const key = await subtle.importKey('raw', keyBytes, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertextWithTag = await subtle.encrypt(
        { name: 'AES-GCM', iv: nonce, tagLength: 128 },
        key,
        encoded,
    );
    return {
        cipherText: uint8ArrayToHex(new Uint8Array(ciphertextWithTag)),
        cipherKey: uint8ArrayToHex(keyBytes),
        cipherIV: uint8ArrayToHex(nonce),
        version: '2',
    };
}

/**
 * Decrypt v2 ciphertext given the AES key + nonce in hex. Returns the UTF-8 string.
 * Throws if validation fails or tag doesn't match.
 */
export async function decrypt(cipherTextHex, keyHex, ivHex) {
    validateHexInput(ivHex, 'IV', GCM_NONCE_BYTES, null);
    validateHexInput(keyHex, 'key', KEY_BYTES, null);
    validateHexInput(cipherTextHex, 'ciphertext', null, MAX_CIPHERTEXT_HEX_LENGTH);
    const key = await subtle.importKey('raw', hexToUint8Array(keyHex), { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plaintext = await subtle.decrypt(
        { name: 'AES-GCM', iv: hexToUint8Array(ivHex), tagLength: 128 },
        key,
        hexToUint8Array(cipherTextHex),
    );
    return new TextDecoder().decode(plaintext);
}

/**
 * Split a hex-encoded 32-byte key into N shares with threshold T using Shamir over GF(2^8).
 * Matches the v2 web-app split exactly so kits are unlockable by papervault.xyz.
 */
export async function splitKey(secretKeyHex, numberOfShares, threshold) {
    if (typeof secretKeyHex !== 'string' || secretKeyHex.length === 0) {
        throw new Error('splitKey: secretKey must be a non-empty string.');
    }
    if (secretKeyHex.length !== KEY_BYTES * 2 || !HEX_REGEX.test(secretKeyHex)) {
        throw new Error('splitKey: secretKey must be 32-byte hex (64 chars).');
    }
    const n = Number(numberOfShares);
    const t = Number(threshold);
    if (!Number.isInteger(n) || n < 1 || n > LIMITS.MAX_KEYS) {
        throw new Error(`splitKey: numberOfShares must be 1..${LIMITS.MAX_KEYS}.`);
    }
    if (!Number.isInteger(t) || t < 1 || t > n) {
        throw new Error('splitKey: threshold must be 1..numberOfShares.');
    }
    if (n > 1 && t < 2) {
        throw new Error('Shamir requires threshold >= 2 when shares > 1.');
    }
    const secret = hexToUint8Array(secretKeyHex);
    const shareArrays = await shamirSplit(secret, n, t);
    return shareArrays.map(arr => uint8ArrayToHex(arr));
}

/**
 * Recombine threshold-or-more hex shares back into the 32-byte key (hex).
 */
export async function combineShares(shares) {
    if (!Array.isArray(shares) || shares.length === 0) {
        throw new Error('combineShares: shares must be a non-empty array.');
    }
    if (shares.length > LIMITS.MAX_KEYS) {
        throw new Error(`combineShares: too many shares (max ${LIMITS.MAX_KEYS}).`);
    }
    for (let i = 0; i < shares.length; i++) {
        const s = shares[i];
        if (typeof s !== 'string' || s.length === 0 || s.length % 2 !== 0 || !HEX_REGEX.test(s)) {
            throw new Error(`combineShares: share ${i} must be a valid hex string with even length.`);
        }
    }
    const shareArrays = shares.map(hex => hexToUint8Array(hex));
    const secret = await shamirCombine(shareArrays);
    return uint8ArrayToHex(secret);
}

/**
 * Generate human-friendly two-word key aliases using BIP39 wordlist.
 * Returns N aliases like "atom-river", "moon-glass".
 */
export function generateKeyAliases(amount) {
    if (!Number.isInteger(amount) || amount < 1 || amount > LIMITS.MAX_KEYS) {
        throw new Error(`generateKeyAliases: amount must be 1..${LIMITS.MAX_KEYS}.`);
    }
    const cleanWords = [];
    for (let i = 0; i < 4; i++) {
        const entropyBytes = secureRandomBytes(16);
        const entropyHex = uint8ArrayToHex(entropyBytes);
        const words = bip39.entropyToMnemonic(entropyHex).split(' ');
        cleanWords.push(...words);
    }
    const result = [];
    let c = 0;
    for (let i = 0; i < cleanWords.length && c < amount; i += 2) {
        result.push(`${cleanWords[i]}-${cleanWords[i + 1]}`);
        c++;
    }
    return result;
}

/**
 * Short public ID for a vault (6 hex chars). Used for folder naming and display.
 * NOT a secret — derived from fresh random bytes, no relation to the key.
 */
export function generateVaultId() {
    return uint8ArrayToHex(secureRandomBytes(3));
}
