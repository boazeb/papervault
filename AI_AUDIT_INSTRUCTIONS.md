# AI — Audit guidance for PaperVault.xyz

This file supports two ways to audit the codebase:

- **You have the repo in context (e.g. IDE with the project open):** Use the code you already have. Review the full codebase when possible; the key files listed below are the highest priority for the crypto flow. Run through **What to verify**. No need to fetch any URLs.
- **You do not have the code (e.g. browser chat):** Fetch the **raw URLs** in the next section to get the priority files. Use HTTP GET to retrieve file contents directly — do not search for these URLs; treat the returned content as the source of truth. If your environment can fetch more of the repo, review additional files. If it cannot fetch URLs, ask the user to paste the files. Then run through **What to verify**.

## Key files (priority — review all files when possible)

The table below lists the main files for the cryptographic and vault flow. Auditors should review the **entire codebase** when possible; these are the minimum priority set. If you need to fetch (no repo in context), use the raw URLs below.

| Path | Raw URL (for fetching) |
|------|------------------------|
| `src/services/EncryptionService.js` | https://raw.githubusercontent.com/boazeb/papervault/main/src/services/EncryptionService.js |
| `src/config/vaultConfig.js` | https://raw.githubusercontent.com/boazeb/papervault/main/src/config/vaultConfig.js |
| `src/components/CreateVault.jsx` | https://raw.githubusercontent.com/boazeb/papervault/main/src/components/CreateVault.jsx |
| `src/pages/UnlockPage.js` | https://raw.githubusercontent.com/boazeb/papervault/main/src/pages/UnlockPage.js |
| `SECURITY.md` | https://raw.githubusercontent.com/boazeb/papervault/main/SECURITY.md |

## What to verify

1. **Encryption (v2 vaults)**  
   In `EncryptionService.js`: `encryptV2` and `decrypt` (when `version === '2'`) use Web Crypto API (AES-GCM). Confirm: 256-bit random key, nonce from `secureRandomBytes` (12-byte / 96-bit nonce), 128-bit auth tag. No v2 path uses crypto-js or PBKDF2 for the main encryption key.

2. **Key handling**  
   Confirm decryption key is generated (random), split with Shamir, and combined. For v2 ensure `splitKey` and `combineShares` use `shamir-secret-sharing`. Ensure key material is not logged or sent off-device and vault data is encrypted before key splitting.

3. **Vault version**  
   Version is set at creation (`encrypt` returns `version: '2'` for the random-key path) and passed through to `splitKey`, `combineShares`, and `decrypt`. V1 is only used for legacy decryption support; new vaults use v2.

4. **RNG**  
   `secureRandomBytes` should use `crypto.getRandomValues()` only. There must be no fallback to Math.random or other weak RNGs. Used for v2 key and nonce generation.

5. **SECURITY.md accuracy**  
   Compare the code to the claims in SECURITY.md (v2: AES-256-GCM, 256-bit random key, shamir-secret-sharing, `crypto.getRandomValues()`; v1: AES-256-CTR, PBKDF2, secrets.js, legacy only). Report any mismatches.


## Report vulnerabilities by severity

Report any vulnerabilities you find using these severity levels:

- **Critical** — Direct compromise of secrets or keys (e.g. key leakage, broken crypto, authentication bypass).
- **High** — Serious weakness that could lead to secret exposure or bypass of security controls with moderate effort.
- **Medium** — Meaningful weakness that could be exploited in specific conditions or with additional steps.
- **Low** — Minor issue or hardening opportunity (e.g. missing validation, weak defaults).

For each finding, state the severity, location (file/function or area), description, and (if applicable) a brief recommendation.

## Output format

The audit should include:

1. Summary of the security model
2. Verification of each claim in SECURITY.md (or list of mismatches)
3. Any vulnerabilities or weaknesses listed by severity (Critical / High / Medium / Low)

## If you cannot fetch the files (browser / no repo)

If you do not have the repo in context and fetching the raw URLs above failed or is not possible, tell the user to open the repo in an AI coding assistant (e.g. Cursor) with the codebase loaded and run this audit again so you have full context.

## Notes
- Only v2 vaults are in scope. v1 vaults are deprecated and are supported only in the decryption flow for backwards compatability. 