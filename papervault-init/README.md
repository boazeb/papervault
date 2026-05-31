# PaperVault Init — One-step setup wizard

**PaperVault 📄🔐** is a free open source tool for creating offline paper-based data vaults for your foundational secrets, such as passwords, 2FA recovery codes, digital asset keys, hard drive encryption keys, and other critical data.

This is the **setup wizard** — a `npx`-friendly wrapper around `papervault init` for users who don't want to install the full CLI globally first. Same wizard either way.

The browser app lives at [papervault.xyz](https://papervault.xyz). The CLI lives at [`@papervault/cli`](https://www.npmjs.com/package/@papervault/cli).

## 🚀 Quick Start

```bash
npx @papervault/init
```

That's it. The wizard walks you through:

- **Where are your secrets?** — type them in now, import a `.env`, point at Azure Key Vault, or use a JSON file.
- **How many key shares?** — Shamir splits the AES key into N shares; any M can unlock (e.g. 5 keys with 3 required, 3-of-5).
- **Vault name + custodian names** — labels on the printed kit.
- **Save path** — where future kits go.

Manual entry and `.env` import generate the kit immediately and never write secrets to disk. Cloud / file sources write a `papervault.config.json` so the next `papervault backup` is one command.

Requires Node.js ≥ 24.

## 📦 What gets installed

This package depends on [`@papervault/cli`](https://www.npmjs.com/package/@papervault/cli). The `npx` invocation downloads both transitively, runs the wizard, and exits. To use the kit-generation flow afterwards:

```bash
# One-off
npx @papervault/cli backup

# Or install globally so the command lives on your path
npm install -g @papervault/cli
papervault backup
```

See [@papervault/cli's README](https://www.npmjs.com/package/@papervault/cli) for the full command reference, security model, source backends, and the social-recovery explanation.

## 🔗 Related Packages

- [`@papervault/cli`](https://www.npmjs.com/package/@papervault/cli) — Full command-line tool
- [`@papervault/core`](https://www.npmjs.com/package/@papervault/core) — Crypto + Shamir + page generation library
- [`@papervault/mcp`](https://www.npmjs.com/package/@papervault/mcp) — MCP server for AI agents
- [PaperVault web app](https://papervault.xyz) — same crypto, browser version
- [Main repo](https://github.com/boazeb/papervault) — issues, docs, SECURITY.md

## 📄 License

MIT — see [LICENSE](LICENSE).
