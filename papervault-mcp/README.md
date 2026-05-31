# PaperVault MCP — AI-agent safety net for sensitive operations

**PaperVault 📄🔐** is a free open source tool for creating offline paper-based data vaults for your foundational secrets, such as passwords, 2FA recovery codes, digital asset keys, hard drive encryption keys, and other critical data.

This is the **MCP server**. It lets AI agents (Claude Code, Cursor, Claude Desktop, or any [Model Context Protocol](https://modelcontextprotocol.io) client) trigger PaperVault backups as a *safety step* inside sensitive workflows — before rotating a production key, destroying an account, or running a destructive migration. The agent triggers the backup, you get a printable paper recovery kit, and the agent never sees the secret values.

The browser app lives at [papervault.xyz](https://papervault.xyz). The CLI lives at [`@papervault/cli`](https://www.npmjs.com/package/@papervault/cli).

## 🔐 Overview

An agent is about to do something it can't undo. Before it does, it asks PaperVault to snapshot the current credentials to a printable kit. If the operation goes wrong, you have a paper recovery path. Three guarantees by design:

- The agent never receives secret values — they encrypt in memory and land in printable HTML on your disk
- The audit log captures every invocation (with hashed name fingerprints, never plaintext)
- A hard cap of 20 secrets per call prevents bulk exfiltration via a confused agent

## 🚀 Quick Start

```bash
npm install -g @papervault/mcp
```

Add to your MCP client config. For **Claude Code** (`~/.claude/claude_code_config.json` or project `.claude/`):

```json
{
  "mcpServers": {
    "papervault": {
      "command": "papervault-mcp"
    }
  }
}
```

For **Cursor** / **Claude Desktop**: same shape, check your client's docs for the config path.

If you'd rather not install globally:

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

Requires Node.js ≥ 24.

## 🔑 Tools Advertised

| Tool | Purpose |
|---|---|
| `papervault_list_sources` | What secret backends are configured (file, stdin, azure-kv, etc.) |
| `papervault_dry_run` | Preview a backup — returns count + name fingerprint, **no values fetched**. Agent should always call this first to confirm scope. |
| `papervault_backup_from_source` | Generate a kit. Writes HTML files (mode `0600`) to a local directory. Returns vault_id, file list, key aliases — **never values**. |
| `papervault_audit_recent` | Read recent audit log entries (names hashed by default). |

## 📖 Example Agent Prompts

```
Use the papervault MCP server to snapshot the current Azure KV secrets
that match "prod-db-*" before I rotate them. Threshold 2 of 3, save to
/Users/me/dr-backups/.
```

```
Before destroying this AWS account, use papervault to back up the root
credentials. Dry-run first so I can confirm what you'll capture.
```

```
Show me the last 10 papervault backup audit entries — I want to know
what's been backed up this week.
```

## 🛡️ Security Model

### Guardrails (verified by tests)

| Guardrail | Behaviour |
|---|---|
| **Hard cap of 20 secrets per call** | Refuses with `max_secrets` error when more match the selection. |
| **`save_path` must be absolute** | Refuses relative paths so the agent can't write into surprise locations. |
| **System paths refused** | `/etc`, `/usr`, `/bin`, `/sbin`, `/boot`, `/proc`, `/sys`, `/dev`, `C:\Windows`, `C:\Program Files` are blocked. |
| **No secret values in tool responses** | Agent gets vault_id, file paths, key aliases — never the actual secret bytes. |
| **No secret values in audit log** | Names hashed to a 16-char fingerprint by default. Set `PAPERVAULT_LOG_NAMES=1` to log plaintext names. |
| **File permissions** | Written kits are `chmod 0600` (owner-only readable). |
| **No auto-print scripts in saved files** | Agent-saved files don't trigger print dialogs when opened later. |
| **No network egress** | Backups go to local disk only. There is no upload, email, or printer-discovery code path. |
| **Two-phase fetch** | `list()` (metadata only) runs before `fetch()` (values), so the max-secrets check happens before any secret leaves the source. |

### Threat Model

PaperVault MCP does NOT protect against:

- ❌ A trusted-by-you agent acting in bad faith with the access it has
- ❌ Compromise of the cloud secret store the source URI points at
- ❌ Physical compromise of the printed kit
- ❌ Malicious modifications to the MCP server source code
- ❌ Tampered MCP client routing tool calls to a malicious server

The MCP server runs on **your** machine with **your** identity. It uses your existing cloud credentials (`az login`, etc.) — we never store or transmit credentials. The agent only sees what the tool schemas explicitly return.

That said: an agent with access to this server can encrypt your secrets to disk under any allowed path. If you don't trust the agent, don't enable the tool. The audit log is your friend for after-the-fact review.

## 🔧 Configuration

| Environment variable | Effect |
|---|---|
| `PAPERVAULT_AUDIT_LOG` | Path to the audit log file (default `~/.papervault/audit.log`). |
| `PAPERVAULT_LOG_NAMES=1` | Log secret names in plaintext instead of fingerprints. |
| `PAPERVAULT_MCP_DEBUG=1` | Print stack traces to stderr on fatal errors. |

For the underlying crypto, source adapters, and limits, see [`@papervault/cli`](https://www.npmjs.com/package/@papervault/cli) and [`@papervault/core`](https://www.npmjs.com/package/@papervault/core).

## 🔗 Related Packages

- [`@papervault/cli`](https://www.npmjs.com/package/@papervault/cli) — Command-line front-end (humans, not agents)
- [`@papervault/core`](https://www.npmjs.com/package/@papervault/core) — Crypto + Shamir + page generation library
- [`@papervault/init`](https://www.npmjs.com/package/@papervault/init) — `npx` setup wizard
- [PaperVault web app](https://papervault.xyz) — same crypto, browser version
- [Main repo](https://github.com/boazeb/papervault) — issues, docs, SECURITY.md

## 🤝 Contributing

Contributions are welcome! See the main repo at [github.com/boazeb/papervault](https://github.com/boazeb/papervault).

## 📄 License

MIT — see [LICENSE](LICENSE).

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing) algorithm by Adi Shamir

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Users are responsible for:

- Verifying that the agents they grant access to the tool are trustworthy
- Reviewing the audit log periodically
- Testing recovery procedures before relying on them
- Understanding the cryptographic principles involved

**Always test with non-critical data first!**
