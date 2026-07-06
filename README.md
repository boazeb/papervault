# PaperVault - Store secrets on paper using threshold encryption

**PaperVault 📄🔐** is a free open source tool for creating offline paper-based data vaults for your foundational secrets, such as passwords, 2FA recovery codes, digital asset keys, hard drive encryption keys, and other critical data.

![PaperVault vault and key cards](src/images/papervault.jpg)

## 🔐 Overview

PaperVault encrypts your secrets and splits the decryption key into shards that can be printed on paper or saved to digital media. Keys are split using [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing). Choose how many keys to create and how many are needed to unlock—for example, 5 keys with any 3 required (3-of-5).

## 🚀 Quick Start

Pick what fits:

| Entry point | Best for |
|---|---|
| [Web app](#-web-app) | Zero install, runs in any browser |
| [Self-hosted web app](#-self-hosted-web-app-recommended-for-maximum-security) | Maximum security, air-gapped |
| [Standalone app](#-standalone-app-single-executable) | Offline use — download &amp; double-click, no Node/npm |
| [Command line](#-command-line) | Scripts, `.env` imports, pulling from secret stores |
| [AI agents (MCP)](#-ai-agents-claude-code-cursor-other-mcp-clients) | Backing up secrets before risky operations |
| [Docker](#-docker) | Containerized deployment |
| [Library](#-library) | Embedding PaperVault in your own tool |

Any vault unlocks at [papervault.xyz/unlock](https://papervault.xyz/unlock) or on your self-hosted instance at `/unlock`. The vault format is identical across all entry points.

### 🌐 Web app

Visit [papervault.xyz](https://papervault.xyz). The app is a static React bundle that runs entirely in your browser.

### 🏠 Self-hosted web app (recommended for maximum security)

Run the same web app on your own machine, ideally air-gapped.

```bash
git clone https://github.com/boazeb/papervault.git
cd papervault
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### 💾 Standalone app (single executable)

A prebuilt PaperVault you download and open — no Node, npm, or build step. It runs a small local server and opens PaperVault in your browser, fully offline.

Download for your platform from the [**Releases page**](https://github.com/boazeb/papervault/releases/latest):

| Platform | Download | Run it |
|---|---|---|
| **macOS** (Apple Silicon) | `PaperVault-macos-arm64.zip` | Unzip, then double-click **PaperVault** |
| **Linux** (x64) | `papervault-linux-x64.tar.gz` | `tar xzf papervault-linux-x64.tar.gz && ./papervault` |
| **Windows** (x64) | `papervault-windows-x64.exe` | Double-click it |

It serves over `http://127.0.0.1` — a browser "secure context", so the camera, QR scanner, and Web Crypto all work locally. On macOS a small window lets you **Quit**; on Linux/Windows press **Ctrl+C** to stop.

**First launch** — the builds aren't notarized/code-signed yet, so the OS warns once:

- **macOS** (Sequoia / Tahoe): after the first blocked attempt, open **System Settings → Privacy & Security**, find the note about *PaperVault*, and click **Open Anyway**. *(Older macOS: right-click the app → **Open** → **Open**.)*
- **Windows:** on the SmartScreen dialog, click **More info → Run anyway**.
- **Linux:** no prompt.

Every artifact carries a signed build-provenance attestation — verify any download with:

```bash
gh attestation verify PaperVault-macos-arm64.zip --repo boazeb/papervault
```

### 💻 Command line

```bash
npm install -g @papervault/cli
papervault init
```

The init wizard walks through configuration. The CLI accepts secrets from `.env` files, JSON, Azure Key Vault, or interactive entry, and produces the same printable kit.

### 🤖 AI agents (Claude Code, Cursor, other MCP clients)

Add the PaperVault MCP server to your AI client. Agents can then trigger paper backups before risky operations like key rotation or account deletion, without ever seeing the secret values.

For Claude Code, one command:

```bash
claude mcp add -s user papervault -- npx -y @papervault/mcp
```

For other clients (Cursor, Claude Desktop, etc.), add this to the client's MCP config file:

```json
{
  "mcpServers": {
    "papervault": {
      "command": "npx",
      "args": ["-y", "@papervault/mcp"]
    }
  }
}
```

Then restart the client (or start a new Claude Code conversation) to load the server. See [`@papervault/mcp`](papervault-mcp/) for the full tool reference and client-specific config paths.

### 🐳 Docker

```bash
docker build -t papervault .
docker run -p 3000:3000 papervault
```

### 📦 Library

For embedding PaperVault in another tool, use [`@papervault/core`](papervault-core/). It exposes the crypto, Shamir splitting, and HTML page generation as standalone functions.

## 🔑 Key Features

- **Works offline** - No internet required after installation; run it yourself, designed for air-gapped use.
- **Client-side only** - No data ever leaves your device.
- **Printable** - Vault and keys are printable and downloadable to digital media for offline distributed storage.
- **Flexible thresholds** - Any M-of-N combination (up to 20 keys).
- **Social recovery & digital inheritance** - Keys can be distributed for recovery in emergencies.

## 📄 Vault vs key shares (social recovery)

PaperVault does not split your secret amongst keyholders. Instead, the encrypted vault and the key shares are separate documents. This gives you extra degrees of configuration when using PaperVault for social recovery:

- **Keyholders** hold key shares (e.g. family, friends, co-trustees). They can combine enough shares to reconstruct the decryption key—but **keys alone are not enough**. They also need the **vault page**.
- **Vault holders** hold the vault page. Without enough key shares, the vault page is useless.

So even if keyholders collude, they cannot unlock the vault unless they also get the vault page. You can keep the vault page yourself, give it to a different person, or store copies in a different locations from the keys.

## 🔍 Audit with AI

This is open source software. Security researchers are encouraged to review the implementation and report security issues. To run a quick AI-assisted audit yourself, select your preferred assistant:

- **[ChatGPT](https://chat.openai.com/?q=Perform%20a%20security%20audit%20of%20PaperVault%20(https%3A%2F%2Fgithub.com%2Fboazeb%2Fpapervault).%20Start%20by%20following%20the%20instructions%20here%3A%20https%3A%2F%2Fraw.githubusercontent.com%2Fboazeb%2Fpapervault%2Fmain%2FAI_AUDIT_INSTRUCTIONS.md)**
- **[Claude](https://claude.ai/new?q=Perform%20a%20security%20audit%20of%20PaperVault%20(https%3A%2F%2Fgithub.com%2Fboazeb%2Fpapervault).%20Start%20by%20following%20the%20instructions%20here%3A%20https%3A%2F%2Fraw.githubusercontent.com%2Fboazeb%2Fpapervault%2Fmain%2FAI_AUDIT_INSTRUCTIONS.md)**
- **[Gemini](https://gemini.google.com/?q=Perform%20a%20security%20audit%20of%20PaperVault%20(https%3A%2F%2Fgithub.com%2Fboazeb%2Fpapervault).%20Start%20by%20following%20the%20instructions%20here%3A%20https%3A%2F%2Fraw.githubusercontent.com%2Fboazeb%2Fpapervault%2Fmain%2FAI_AUDIT_INSTRUCTIONS.md)**
- **[Grok](https://grok.com/?q=Perform%20a%20security%20audit%20of%20PaperVault%20(https%3A%2F%2Fgithub.com%2Fboazeb%2Fpapervault).%20Start%20by%20following%20the%20instructions%20here%3A%20https%3A%2F%2Fraw.githubusercontent.com%2Fboazeb%2Fpapervault%2Fmain%2FAI_AUDIT_INSTRUCTIONS.md)**
- **[Perplexity](https://www.perplexity.ai/search?q=Perform%20a%20security%20audit%20of%20PaperVault%20(https%3A%2F%2Fgithub.com%2Fboazeb%2Fpapervault).%20Start%20by%20following%20the%20instructions%20here%3A%20https%3A%2F%2Fraw.githubusercontent.com%2Fboazeb%2Fpapervault%2Fmain%2FAI_AUDIT_INSTRUCTIONS.md)**

## 🛡️ Security Model

### Cryptographic Foundation

- **Algorithm**: Shamir's Secret Sharing over GF(2^8). Vaults use [shamir-secret-sharing](https://github.com/privy-io/shamir-secret-sharing).
- **Encryption**: AES-256-GCM (authenticated) for v2 vaults via the Web Crypto API; legacy v1 vaults use AES-256-CTR and remain supported for unlock and backwards compatability.
- **Key Generation**: Cryptographically secure random number generation via `crypto.getRandomValues()` (Web Crypto API).
- **QR Codes**: Version 6-8 QR codes with level-M error correction (~15% damage recovery) for reliable scanning from paper.

See [SECURITY.md](SECURITY.md) for detailed security details, vault versions, and vulnerability reporting.

### Security Best Practices

1. **Air-Gapped Usage**: Run PaperVault.xyz from an offline computer for maximum security
2. **Source Code Review**: Audit the code before using with critical secrets
3. **Physical Security**: Store paper keys in separate, secure locations
4. **Test Recovery**: Always test your recovery process
5. **Durable storage**: For maximum durability, consider archive-grade paper in tamper-evident envelopes with an insert to keep the paper flat and protected


### Threat Model

PaperVault does NOT protect against:

- ❌ Physical compromise of threshold number of keys + vault
- ❌ Shoulder surfing during secret entry
- ❌ Malicious modifications to the source code
- ❌ Social engineering

## 📖 How It Works

1. **Create Vault**: Enter your secret data (passwords, seed phrases, etc.)
2. **Configure Shares**: Choose number of keys and recovery threshold
3. **Generate Keys**: Cryptographically split your decryption key using Shamir's algorithm
4. **Print & Distribute**: Generate vault backups and distribute keys securely
5. **Recovery**: Use any threshold number of keys to decrypt your vault

## 🔧 Technical Details

### Architecture

- **Frontend**: React 17 with Bootstrap UI
- **Cryptography**: JavaScript implementation of Shamir's Secret Sharing
- **PDF Generation**: React-PDF for document output
- **QR Codes**: Optimized for mobile scanning and printing
- **Storage**: Client-side only, no external dependencies

### Limits

- **Maximum Keys**: 20 (cryptographic library constraint)
- **Storage Limit**: 300 characters per vault (QR code optimization)

## 🤝 Contributing

Contributions are welcome!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing) algorithm by Adi Shamir
- [shamir-secret-sharing](https://github.com/privy-io/shamir-secret-sharing) (v2 vaults)
- [secrets.js](https://github.com/amper5and/secrets.js) (legacy v1 vaults)


## 📞 Support

- **Issues**: Report bugs via [GitHub Issues](https://github.com/boazeb/papervault/issues)

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Users are responsible for:

- Verifying the security of their implementation
- Testing recovery procedures before relying on them
- Maintaining physical security of printed keys
- Understanding the cryptographic principles involved

**Always test with non-critical data first!**