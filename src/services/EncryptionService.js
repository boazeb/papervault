import secrets from 'secrets.js';
import { split as shamirSplit, combine as shamirCombine } from 'shamir-secret-sharing';
import { CURRENT_VAULT_VERSION, VAULT_VERSIONS } from '../config/vaultConfig';
import { LIMITS } from '../config/limits';

const CryptoJS = require("crypto-js");
const bip39 = require('bip39');

const GCM_NONCE_BYTES = 12;

// Validation constants for decrypt inputs
const IV_BYTES = 16;
const KEY_BYTES = 32;
const MAX_CIPHERTEXT_HEX_LENGTH = 2 * 1024 * 1024; // 2MB hex = 1MB plaintext max

const HEX_REGEX = /^[0-9a-fA-F]+$/;

/**
 * Cryptographically secure random bytes using Web Crypto API.
 * Required for all key/IV/nonce/salt generation. No fallback to Math.random.
 * @param {number} length - Number of bytes to generate
 * @returns {Uint8Array}
 */
function secureRandomBytes(length) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return crypto.getRandomValues(new Uint8Array(length));
    }
    throw new Error('secureRandomBytes: crypto.getRandomValues is not available. Use a supported browser.');
}

function hexToUint8Array(hex) {
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

function uint8ArrayToHex(arr) {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function uint8ArrayToWordArray(arr) {
    const words = [];
    for (let i = 0; i < arr.length; i += 4) {
        words.push(
            (arr[i] << 24) |
            ((arr[i + 1] || 0) << 16) |
            ((arr[i + 2] || 0) << 8) |
            (arr[i + 3] || 0)
        );
    }
    return CryptoJS.lib.WordArray.create(words, arr.length);
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
            throw new Error(`Invalid ${label}: expected ${exactBytes} bytes (${expectedLen} hex chars), got ${value.length / 2} bytes.`);
        }
    }
    if (maxHexLength != null && value.length > maxHexLength) {
        throw new Error(`Invalid ${label}: exceeds maximum allowed size.`);
    }
}

export class EncryptionService {
    static encrypt = async (dataToEncrypt, password) => {
        if (typeof dataToEncrypt !== 'string') {
            throw new Error('Secret data must be a string.');
        }
        if (!password) {
            const keyBytes = secureRandomBytes(32);
            const nonce = secureRandomBytes(GCM_NONCE_BYTES);
            const key = await crypto.subtle.importKey(
                'raw',
                keyBytes,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt']
            );
            const encoded = new TextEncoder().encode(dataToEncrypt);
            const ciphertextWithTag = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: nonce, tagLength: 128 },
                key,
                encoded
            );
            return {
                cipherText: uint8ArrayToHex(new Uint8Array(ciphertextWithTag)),
                cipherKey: uint8ArrayToHex(keyBytes),
                cipherIV: uint8ArrayToHex(nonce),
                cipherOpenSSL: null,
                version: '2'
            };
        }

        let salt        = uint8ArrayToWordArray(secureRandomBytes(16));
        let passphrase  = uint8ArrayToWordArray(secureRandomBytes(16));
        let iv          = uint8ArrayToWordArray(secureRandomBytes(16));

        const encryptionOptions = {
            iv      : iv,
            mode    : CryptoJS.mode.CTR,
            padding : CryptoJS.pad.NoPadding,
            hasher  : CryptoJS.algo.SHA256
        };

        const key = CryptoJS.PBKDF2(passphrase, salt, {
            keySize: 256/32,
            iterations: 100000
        });

        const ciphertext = CryptoJS.AES.encrypt(dataToEncrypt, key, encryptionOptions);

        return {
            cipherText: ciphertext.ciphertext.toString(CryptoJS.enc.Hex),
            cipherKey: ciphertext.key.toString(CryptoJS.enc.Hex),
            cipherIV: ciphertext.iv.toString(CryptoJS.enc.Hex),
            cipherOpenSSL: ciphertext.toString(),
            version: '1'
        };
    };

    static decrypt = async (dataToDecrypt, secretKey, iv, version = CURRENT_VAULT_VERSION) => {
        if (!VAULT_VERSIONS[version]) {
            throw new Error(`Unsupported vault version: ${version}. Please update your software.`);
        }

        if (version === '2') {
            validateHexInput(iv, 'IV', GCM_NONCE_BYTES, null);
            validateHexInput(secretKey, 'key', KEY_BYTES, null);
            validateHexInput(dataToDecrypt, 'ciphertext', null, MAX_CIPHERTEXT_HEX_LENGTH);
            const key = await crypto.subtle.importKey(
                'raw',
                hexToUint8Array(secretKey),
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );
            const nonce = hexToUint8Array(iv);
            const ciphertextWithTag = hexToUint8Array(dataToDecrypt);
            const plaintext = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: nonce, tagLength: 128 },
                key,
                ciphertextWithTag
            );
            return new TextDecoder().decode(plaintext);
        }

        validateHexInput(iv, 'IV', IV_BYTES, null);
        validateHexInput(secretKey, 'key', KEY_BYTES, null);
        validateHexInput(dataToDecrypt, 'ciphertext', null, MAX_CIPHERTEXT_HEX_LENGTH);

        const encryptionOptions = {
            iv      : CryptoJS.enc.Hex.parse(iv),
            mode    : CryptoJS.mode.CTR,
            padding : CryptoJS.pad.NoPadding,
            hasher  : CryptoJS.algo.SHA256
        };

        const key = CryptoJS.enc.Hex.parse(secretKey);
        const ciphertext = CryptoJS.enc.Hex.parse(dataToDecrypt);
        const decrypted = CryptoJS.AES.decrypt({ciphertext:ciphertext}, key, encryptionOptions);
        return decrypted.toString(CryptoJS.enc.Utf8);
    };

    static splitKey = async (secretKey, numberOfShares, threshold, version = CURRENT_VAULT_VERSION) => {
        const MAX_SECRET_KEY_LENGTH = 2048;

        if (typeof secretKey !== 'string' || secretKey.length === 0) {
            throw new Error('splitKey: secretKey must be a non-empty string.');
        }
        if (secretKey.length > MAX_SECRET_KEY_LENGTH) {
            throw new Error(`splitKey: secretKey exceeds maximum length (${MAX_SECRET_KEY_LENGTH}).`);
        }

        const n = Number(numberOfShares);
        const t = Number(threshold);
        if (!Number.isInteger(n) || n < 1 || n > LIMITS.MAX_KEYS) {
            throw new Error(`splitKey: numberOfShares must be an integer from 1 to ${LIMITS.MAX_KEYS}.`);
        }
        if (!Number.isInteger(t) || t < 1 || t > n) {
            throw new Error('splitKey: threshold must be an integer from 1 to numberOfShares.');
        }
        if (n > 1 && t < 2) {
            throw new Error('Cryptographic library requires threshold >= 2 for multiple keys. Use single key instead.');
        }

        if (version === '2') {
            if (secretKey.length !== 64 || !HEX_REGEX.test(secretKey)) {
                throw new Error('splitKey: for v2, secretKey must be 32-byte hex (64 characters).');
            }
            const secret = hexToUint8Array(secretKey);
            const shareArrays = await shamirSplit(secret, n, t);
            return shareArrays.map(arr => uint8ArrayToHex(arr));
        }

        const pwHex = secrets.str2hex(secretKey);
        const shares = secrets.share(pwHex, n, t);
        return shares;
    };

    static combineShares = async (shares, version = CURRENT_VAULT_VERSION) => {
        const MAX_SHARES = LIMITS.MAX_KEYS;
        const MAX_SHARE_LENGTH = 2048;

        if (!Array.isArray(shares)) {
            throw new Error('combineShares: shares must be an array.');
        }
        if (shares.length === 0) {
            throw new Error('combineShares: at least one share is required.');
        }
        if (shares.length > MAX_SHARES) {
            throw new Error(`combineShares: too many shares (max ${MAX_SHARES}).`);
        }
        for (let i = 0; i < shares.length; i++) {
            if (typeof shares[i] !== 'string' || shares[i].length === 0) {
                throw new Error(`combineShares: share at index ${i} must be a non-empty string.`);
            }
            if (shares[i].length > MAX_SHARE_LENGTH) {
                throw new Error(`combineShares: share at index ${i} exceeds maximum length.`);
            }
        }

        if (version === '2') {
            for (let i = 0; i < shares.length; i++) {
                const s = shares[i];
                if (typeof s !== 'string' || s.length === 0) {
                    throw new Error(`combineShares: share at index ${i} must be a non-empty string.`);
                }
                if (s.length % 2 !== 0 || !HEX_REGEX.test(s)) {
                    throw new Error(`combineShares: share at index ${i} must be a valid hex string with even length.`);
                }
            }
            try {
                const shareArrays = shares.map(hex => hexToUint8Array(hex));
                const secret = await shamirCombine(shareArrays);
                return uint8ArrayToHex(secret);
            } catch (error) {
                throw new Error(`Failed to combine shares: ${error.message}`);
            }
        }

        try {
            const comb = secrets.combine(shares);
            return secrets.hex2str(comb);
        } catch (error) {
            throw new Error(`Failed to combine shares: ${error.message}`);
        }
    };



    static generateListOfCombinedWords = (amount) => {
        const mnemonic = [];
        for (let i = 0; i < 4; i++) {
            const entropyBytes = secureRandomBytes(16);
            const entropyHex = Array.from(entropyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            mnemonic.push(bip39.entropyToMnemonic(entropyHex).split(' '));
        }
        let cleanWords = [];

        mnemonic.forEach((row) => {
            row.forEach((word) => {
                    cleanWords.push((word));
            });
        });

        let returnArray = [];
        let c = 0;
        for (let i = 0; i < cleanWords.length; i += 2) {
            const word1 = cleanWords[i];
            const word2 = cleanWords[i + 1];

            const combined = word1+'-' + word2;

            if (c<amount) {
                returnArray.push(combined);
                c++;
            }
        }

        return returnArray;
    }
}

