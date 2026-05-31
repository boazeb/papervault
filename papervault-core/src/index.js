// Public API for @papervault/core.
// Consumed by @papervault/cli and (in the future) @papervault/mcp.

export { createKit } from './kit.js';
export { compress, countUserContent } from './compress.js';
export {
    encrypt,
    decrypt,
    splitKey,
    combineShares,
    generateKeyAliases,
    generateVaultId,
    secureRandomBytes,
    uint8ArrayToHex,
    hexToUint8Array,
} from './crypto.js';
export {
    generateVaultPage,
    generateKeyPage,
    generateSelectorPage,
} from './templates/index.js';
export { LIMITS, VAULT_VERSION, VAULT_IDENT } from './constants.js';
