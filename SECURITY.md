# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Security Model

### Cryptographic Implementation

PaperVault.xyz uses industry-standard cryptographic primitives:

- **Secret Sharing**: Shamir's Secret Sharing over GF(2^8)
- **Encryption**: AES-256 for vault data encryption
- **Random Generation**: Cryptographically secure random number generation
- **Key Derivation**: Standard key derivation functions

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

### Shamir's Secret Sharing
- **Field**: GF(2^8) - Galois Field with 256 elements
- **Polynomial**: Random polynomial of degree (threshold - 1)
- **Shares**: Each share is a point on the polynomial
- **Reconstruction**: Lagrange interpolation for secret recovery

### AES Encryption
- **Algorithm**: AES-256 in CTR mode
- **Key Generation**: PBKDF2 with random salt (for vault creation); key is split via Shamir's Secret Sharing
- **IV**: Cryptographically random initialization vector (16 bytes)
- **Padding**: None (CTR is a stream-cipher mode and does not require padding)
- **Integrity**: Current design provides confidentiality only; ciphertext is not authenticated. Tampering with stored or printed ciphertext may alter decrypted data undetected.

### Random Number Generation
- **Source**: `crypto.getRandomValues()` Web Crypto API
- **Fallback**: High-entropy sources where available
- **Validation**: Entropy testing for random number quality

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
