/**
 * Vault Configuration
 * 
 * This file contains configuration settings for the vault system,
 * including version information and cryptographic parameters.
 */

// Current vault version
export const CURRENT_VAULT_VERSION = '1';

// Vault version definitions
export const VAULT_VERSIONS = {
    '1': {
        algorithm: 'AES-256-CTR',
        kdf: 'PBKDF2',
        
    }
};

// Helper function to check if a version is supported
export const isVersionSupported = (version) => {
    return VAULT_VERSIONS[version] !== undefined;
};

// Helper function to get version details
export const getVersionDetails = (version) => {
    return VAULT_VERSIONS[version] || null;
}; 