import secrets from 'secrets.js';
import { CURRENT_VAULT_VERSION, VAULT_VERSIONS } from '../config/vaultConfig';
import { LIMITS } from '../config/limits';

const CryptoJS = require("crypto-js");
const bip39 = require('bip39');

// Validation constants for decrypt inputs
const IV_BYTES = 16;
const KEY_BYTES = 32;
const MAX_CIPHERTEXT_HEX_LENGTH = 2 * 1024 * 1024; // 2MB hex = 1MB plaintext max

const HEX_REGEX = /^[0-9a-fA-F]+$/;

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
    static hash =  (dataToHash) => {
        return CryptoJS.SHA256(dataToHash).toString();
    };

    static encrypt = async (dataToEncrypt, password) => {

        let salt        = CryptoJS.lib.WordArray.random(16);
        let passphrase  = CryptoJS.lib.WordArray.random(16);
        let iv          = CryptoJS.lib.WordArray.random(16);

        // NOTE: The app does not use the password path. Vault creation always calls encrypt(..., false).
        // If this path is ever used, passphrase and salt must not both be set to password (weak KDF).
        if (password) {
            passphrase  = password;
            salt        = password;
        }

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
            version: CURRENT_VAULT_VERSION
        };
    };

    static decrypt = async (dataToDecrypt, secretKey, iv, version = CURRENT_VAULT_VERSION) => {
        // Version validation
        if (!VAULT_VERSIONS[version]) {
            throw new Error(`Unsupported vault version: ${version}. Please update your software.`);
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

    static splitKey = async (secretKey, numberOfShares, threshold) => {
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

        const pwHex = secrets.str2hex(secretKey);
        const shares = secrets.share(pwHex, n, t);
        return shares;
    };

    static combineShares = async (shares) => {
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

        try {
            const comb = secrets.combine(shares);
            return secrets.hex2str(comb);
        } catch (error) {
            throw new Error(`Failed to combine shares: ${error.message}`);
        }
    };



    static generateListOfCombinedWords =  (amount) => {

        let  mnemonic = [];
        let entropy;
        for (let i = 0; i < 4; i++) {
            // Generate a random 128-bit entropy
            entropy = CryptoJS.lib.WordArray.random(16);

            // Convert the entropy to a mnemonic phrase
            mnemonic.push(bip39.entropyToMnemonic(entropy.toString()).split(' '));
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

