// Application limits - technical constraints, not artificial restrictions
export const LIMITS = {
    MAX_KEYS: 20,        // Maximum keys due to cryptographic library constraints
    MAX_STORAGE: 300,    // Storage limit to keep QR codes manageable
    MAX_QR_PAYLOAD_BYTES: 100 * 1024  // 100KB max QR payload to prevent DoS
};

// Helper functions for backward compatibility
export const getCurrentLimits = () => ({
    maxShares: LIMITS.MAX_KEYS,
    maxStorage: LIMITS.MAX_STORAGE
});

export const clearProSession = () => {
    // No-op: no sessions to clear in open source version
};
