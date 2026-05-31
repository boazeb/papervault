# PaperVault CLI — Store secrets on paper using threshold encryption

**PaperVault 📄🔐** is a free open source tool for creating offline paper-based data vaults for your foundational secrets, such as passwords, 2FA recovery codes, digital asset keys, hard drive encryption keys, and other critical data.

This is the **command-line version**. Same crypto, same paper output, same [papervault.xyz/unlock](https://papervault.xyz/unlock) recovery path — but driven from your terminal so you can wire it into shell pipelines, pull straight from secret stores like Azure Key Vault, or import a `.env` file in one command. The browser app lives at [papervault.xyz](https://papervault.xyz).

## 🔐 Overview

PaperVault encrypts your secrets and splits the decryption key into shards that can be printed on paper or saved to digital media. Keys are split using [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing). Choose how many keys to create and how many are needed to unlock — for example, 5 keys with any 3 required (3-of-5).

The CLI produces the same v2 vault format as the browser app, so kits made here unlock identically at [papervault.xyz/unlock](https://papervault.xyz/unlock).

## 🚀 Quick Start

```bash
# Install once
npm install -g @papervault/cli

# Walk through the wizard
papervault init
```

Or run the wizard without installing:

```bash
npx @papervault/init
```

The wizard asks where your secrets live. Three common paths:

| Where they are | What to pick | What happens |
|---|---|---|
| In your head / on a sticky note | **"I'll add them now"** | Walks you through entering each secret; nothing saved to disk. |
| In a `.env` file | **"Import from .env file"** | Multiselect which entries to back up; nothing saved to disk. |
| In Azure Key Vault | **"Azure Key Vault"** | Uses your `az login` cache; writes a `papervault.config.json` so future runs are one command. |

After that, your browser opens with a print-ready kit — print the vault page and each key page, distribute, done.

Requires Node.js ≥ 24.

## 🔑 Key Features

- **Works offline** — No internet required after install; safe to run on an air-gapped machine.
- **Client-side only** — All crypto runs locally. No data ever leaves your device.
- **Printable** — Vault and keys come out as standalone HTML pages with embedded QR codes; print or save as PDF.
- **Flexible thresholds** — Any M-of-N combination (up to 20 keys).
- **Pluggable sources** — Manual entry, `.env` files, Azure Key Vault today; AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, 1Password on the roadmap.
- **Social recovery & digital inheritance** — Keys can be distributed for recovery in emergencies.
- **Round-trip compatible** — Kits unlock at [papervault.xyz/unlock](https://papervault.xyz/unlock), same as web-app vaults.

## 📄 Vault vs key shares (social recovery)

The encrypted vault page and the key share pages are **separate documents** — keyholders need both the threshold of keys *and* the vault page to recover. See [Vault vs key shares](https://github.com/boazeb/papervault#-vault-vs-key-shares-social-recovery) in the main repo for the full social-recovery model.

## 📖 How It Works

1. **Pick a source** — manual entry, `.env`, JSON file, or a cloud secret store. Secrets only ever live in memory.
2. **Configure shares** — choose number of keys (N) and recovery threshold (M).
3. **Encrypt + split** — your secrets are encrypted with a fresh AES-256-GCM key; that key is split via Shamir's algorithm.
4. **Print & distribute** — the CLI opens your browser to an ephemeral, in-memory page with a single "Print kit" button. The OS print dialog handles the rest (use "Save as PDF" from the dialog if you'd rather save than print).
5. **Recovery** — go to [papervault.xyz/unlock](https://papervault.xyz/unlock) on any device, scan the vault QR, then scan any M key QRs. Your secrets reappear.

## 🔧 Commands

```bash
papervault init                    # Interactive wizard (most users start here)
papervault backup [options]        # Generate a kit (reads papervault.config.json if present)
papervault sources list            # Show available secret backends
papervault verify <kit-dir>        # Round-trip check on a saved kit
```

Run any command with `--help` for the full flag reference.

### Source URIs

| Scheme | Status | Notes |
|---|---|---|
| `file://<path>` | ✓ ready | JSON file you maintain — see schema below |
| `stdin` (`-`) | ✓ ready | Pipe JSON in for scripts |
| `azure-kv://<vault-name>` | ✓ ready | Uses `az login` cache |
| `aws-sm://` | roadmap | AWS Secrets Manager |
| `gcp-sm://` | roadmap | GCP Secret Manager |
| `vault://` | roadmap | HashiCorp Vault |
| `1password://` | roadmap | 1Password CLI |

### JSON source schema

For `file://` and stdin sources:

```json
{
  "vaultName": "Optional default label",
  "freeText": "Optional freeform notes",
  "secrets": [
    {"kind": "password", "service": "GitHub", "username": "alice", "password": "...", "url": "https://github.com"},
    {"kind": "wallet",   "name": "BTC cold", "seed": "...", "address": "..."},
    {"kind": "apikey",   "service": "Stripe live", "key": "sk_live_...", "secret": "..."},
    {"kind": "note",     "title": "Lawyer contact", "content": "..."},
    {"kind": "custom",   "label": "anything", "value": "..."}
  ]
}
```

Field names follow the web app's structured-entry format so kits unlock identically there.

### Config file

`papervault init` writes `papervault.config.json` in the current directory for recurring sources:

```json
{
  "version": "1",
  "source": "azure-kv://my-vault",
  "threshold": 2,
  "shares": 3,
  "vaultName": "Production DR Kit",
  "custodianNames": ["alice", "bob", "carol"],
  "savePath": "/Users/me/papervault-backups"
}
```

`papervault backup` picks this up automatically. CLI flags override config values. Pass `--no-config` to ignore it. **The config never holds secret values** — only how/where to fetch them at backup time.

## 🔍 Audit with AI

This is open source software. Run a quick AI-assisted audit via the [Audit with AI](https://github.com/boazeb/papervault#-audit-with-ai) links in the main repo (ChatGPT / Claude / Gemini / Grok / Perplexity, each one-click).

## 🛡️ Security Model

### Cryptographic Foundation

- **Algorithm**: Shamir's Secret Sharing over GF(2^8) via [shamir-secret-sharing](https://github.com/privy-io/shamir-secret-sharing).
- **Encryption**: AES-256-GCM (authenticated) via the Web Crypto API (`crypto.subtle`). No JavaScript reimplementation of the cipher.
- **Key Generation**: Cryptographically secure random number generation via `crypto.getRandomValues()`. Never `Math.random()`.
- **QR Codes**: Level-M error correction (~15% damage recovery) for reliable scanning from paper.
- **Vault format**: v2 — byte-identical to vaults produced by the web app, so kits unlock at [papervault.xyz/unlock](https://papervault.xyz/unlock).

### Security Best Practices

1. **Air-Gapped Usage**: Run the CLI on an offline computer for maximum security.
2. **Source Code Review**: Audit the code before using with critical secrets (see the AI audit links above).
3. **Physical Security**: Store paper keys and the vault page in separate, secure locations.
4. **Test Recovery**: Always test your recovery process at papervault.xyz/unlock before relying on it.
5. **Durable Storage**: For maximum durability, consider archive-grade paper in tamper-evident envelopes.
6. **Audit Log**: The CLI writes one line per invocation to `~/.papervault/audit.log`. Secret values are **never** logged; secret names are hashed to a 16-char fingerprint by default.

### Threat Model

PaperVault does NOT protect against:

- ❌ Physical compromise of threshold number of keys + vault
- ❌ Shoulder surfing during secret entry
- ❌ Malicious modifications to the source code
- ❌ Compromise of the cloud secret store you're pulling from
- ❌ Social engineering

## 🔧 Technical Details

### Architecture

- **Crypto core**: [`@papervault/core`](https://www.npmjs.com/package/@papervault/core) — AES-GCM, Shamir, HTML page generation
- **CLI shell**: this package — interactive wizard, source adapters, ephemeral print server
- **MCP server**: [`@papervault/mcp`](https://www.npmjs.com/package/@papervault/mcp) — lets AI agents trigger backups as a safety step
- **Pure JS**, no native deps. Uses Node 24's built-in WebCrypto.

### Print server

By default, `papervault backup` opens an ephemeral localhost HTTP server bound to `127.0.0.1` on a random port. The server holds the kit in memory only, serves a single-page UI with a "Print kit" button, and shuts down (dropping references) when you click "Done". Use `--save <dir>` to also write the HTML files to disk.

### Limits

- **Maximum Keys**: 20 (cryptographic library constraint)
- **Storage Limit**: 300 characters of user content per vault (QR code optimization — same as the web app)

## 🔗 Related Packages

- [`@papervault/core`](https://www.npmjs.com/package/@papervault/core) — Crypto + Shamir + page generation library
- [`@papervault/mcp`](https://www.npmjs.com/package/@papervault/mcp) — MCP server for AI agents
- [`@papervault/init`](https://www.npmjs.com/package/@papervault/init) — `npx` setup wizard
- [PaperVault web app](https://papervault.xyz) — same crypto, browser version
- [Main repo](https://github.com/boazeb/papervault) — issues, docs, SECURITY.md

## 🤝 Contributing

Contributions are welcome! See the main repo at [github.com/boazeb/papervault](https://github.com/boazeb/papervault).

## 📄 License

MIT — see [LICENSE](LICENSE).

## 🙏 Acknowledgments

- [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing) algorithm by Adi Shamir
- [shamir-secret-sharing](https://github.com/privy-io/shamir-secret-sharing) — Shamir over GF(2^8)
- [bip39](https://github.com/bitcoinjs/bip39) — two-word key aliases
- [qrcode](https://github.com/soldair/node-qrcode) — QR generation
- [@clack/prompts](https://github.com/natemoo-re/clack) — interactive wizard UX

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/boazeb/papervault/issues)

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Users are responsible for:

- Verifying the security of their implementation
- Testing recovery procedures before relying on them
- Maintaining physical security of printed keys
- Understanding the cryptographic principles involved

**Always test with non-critical data first!**
