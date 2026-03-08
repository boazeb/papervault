# Security Policy

## Security Model

### Cryptographic Implementation

PaperVault.xyz uses industry-standard cryptographic primitives. New vaults (version 2) use the following:

- **Secret Sharing**: Shamir's Secret Sharing over GF(2^8) via [shamir-secret-sharing](https://github.com/privy-io/shamir-secret-sharing)
- **Encryption**: AES-256-GCM for vault data (authenticated encryption) via the Web Crypto API
- **Random Generation**: `crypto.getRandomValues()` (Web Crypto API) for all key, nonce, and salt generation
- **Key Generation**: Direct 256-bit random key

Legacy vaults (version 1) remain supported for decryption; see "Known limitations of vault version 1" below.

### Trust Model

PaperVault.xyz operates under the following trust assumptions:

1. **Client-Side Execution**: All cryptographic operations occur in the user's browser
2. **No Network Dependencies**: No external API calls or data transmission
3. **Open Source Verification**: Complete source code available for audit
4. **Physical Security**: Users responsible for physical security of printed keys

### Threat Protection

Your actual security depends on how and where you use PaperVault.xyz. For example, using it on an offline (air-gapped) computer can substantially reduce exposure to compromised software or hardware, since there is no way for data to leave the device.

**PaperVault.xyz deployed offline protects against:**

- Digital device compromise
- Online data breaches
- Single points of failure
- Partial key loss (up to threshold)

**PaperVault.xyz does NOT protect against:**

- Physical compromise of threshold number of keys
- Side-channel attacks during secret entry
- Social engineering attacks

### Security Best Practices

#### For Users

1. **Air-Gapped Usage**: Use on an offline computer for maximum security
2. **Source Verification**: Verify code integrity before use
3. **Test Recovery**: Always test with non-critical data first
4. **Physical Security**: Store keys in separate, secure locations
5. **Threshold Selection**: Choose appropriate M-of-N ratios for your threat model

## Cryptographic Details

### Vault versions

- **Version 2 (current)**: New vaults use AES-256-GCM (Web Crypto API), a 256-bit random key (no KDF), and [shamir-secret-sharing](https://github.com/privy-io/shamir-secret-sharing) for key splitting. RNG is `crypto.getRandomValues()` only. Ciphertext is authenticated (AEAD).
- **Version 1 (legacy)**: AES-256-CTR, PBKDF2 with random salt, secrets.js for Shamir. Supported for decryption only; no new v1 vaults are created.

### Shamir's Secret Sharing

- **Field**: GF(2^8) - Galois Field with 256 elements
- **V2**: [shamir-secret-sharing](https://github.com/privy-io/shamir-secret-sharing)
- **V1**: secrets.js (legacy)

### AES Encryption

- **V2**: AES-256-GCM (Web Crypto API). 12-byte nonce, 128-bit auth tag. Confidentiality and authenticity.
- **V1 (legacy)**: AES-256-CTR, 16-byte IV, no authentication. Confidentiality only; ciphertext is malleable.

### Random Number Generation

- **V2**: `crypto.getRandomValues()` (Web Crypto API) only. No fallback.
- **V1 (legacy)**: Historically used a different RNG; v1 is no longer used for new vaults.

### Known limitations of vault version 1

Vaults created with version 1 remain supported for unlock but have the following limitations:

- **No authenticated encryption**: Ciphertext is not authenticated; tampering may alter decrypted data undetected.
- **Legacy stack**: RNG and crypto libraries used for v1 are not used for new vaults; v1 is retained only for backward compatibility.
- **Recommendation**: Create new vaults as version 2. Migrate important secrets from v1 vaults to new v2 vaults when practical.

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability, please report it responsibly:

### Reporting Process

1. **Email**: Send details to [support@papervault.xyz](mailto:support@papervault.xyz)
2. **Subject**: Include "SECURITY" in the subject line
3. **Details**: Provide detailed reproduction steps
4. **Timeline**: Allow reasonable time for response and fixes

### What to Include

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fixes (if any)
- Your contact information

### Responsible Disclosure

We request that you:

- Do not publicly disclose the vulnerability until we've had time to address it
- Do not access or modify data that doesn't belong to you
- Act in good faith to avoid privacy violations or service disruption

## Security Considerations for Self-Hosting

### Deployment Security

- Deploy to an offline device
- Clear device memory after use
- Verify source code integrity
- Use official dependencies only
- Serve over HTTPS

## Security Resources

### Educational Materials

- [Shamir's Secret Sharing Explained](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing)
- [AES Encryption Standard](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
- [Web Crypto API Security](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

### Tools for Verification

- [Online GF(256) Calculator](https://www.ee.unb.ca/cgi-bin/tervo/calc.pl)
- [AES Test Vectors](https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program/block-ciphers)
- [Entropy Testing Tools](https://github.com/dj-on-github/sp800_22_tests)

## Contact

For security-related questions or concerns:

- **General Support**: [support@papervault.xyz](mailto:support@papervault.xyz)
- **GitHub Issues**: For non-security bugs only

---

