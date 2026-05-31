# Publishing the PaperVault package suite

Step-by-step for shipping `@papervault/core`, `@papervault/cli`, `@papervault/mcp`, and `@papervault/init` to npm.

## One-time setup

### 1. Claim the `@papervault` npm scope

```bash
npm login                       # if not already logged in
npm org create papervault       # creates the org/scope (if you don't own it yet)
```

If `@papervault` is already taken by someone else, pick a different scope name and update all four `package.json` `name` fields.

### 2. Decide on the repo URL

All four `package.json` files currently point at `https://github.com/boazeb/papervault.git` with a `directory:` subpath (assumes the new packages get added to the existing PaperVault repo as siblings to the existing `papervault/` app).

If you want separate repos (one per package) instead, update each `package.json`:

```jsonc
"repository": {
  "type": "git",
  "url": "https://github.com/boazeb/papervault-cli.git"
  // drop "directory" — each package is at the repo root
}
```

## Each release

### 1. Run the publish-prep script

From the workspace root (the directory that contains `papervault-core`, `papervault-cli`, `papervault-mcp`, `papervault-init`):

```bash
node scripts/publish-prep.js prepare 0.1.0
```

This:
- Bumps every `package.json` to `0.1.0`
- Swaps internal `file:` deps to `^0.1.0` (e.g. `@papervault/cli` in `papervault-mcp` goes from `file:../papervault-cli` to `^0.1.0`)
- Validates that LICENSE, README.md, and `publishConfig.access = "public"` are present in every package — fails fast otherwise

### 2. Verify what would be published

```bash
node scripts/publish-prep.js pack-check
```

Runs `npm pack --dry-run` in each package and lists exactly what files will end up in the published tarball. Typical sizes:

| Package | Files | Packed | Unpacked |
|---|---|---|---|
| `@papervault/core` | ~14 | ~17 KB | ~54 KB |
| `@papervault/cli` | ~18 | ~24 KB | ~74 KB |
| `@papervault/mcp` | ~7 | ~10 KB | ~29 KB |
| `@papervault/init` | ~4 | ~3 KB | ~5 KB |

If you see anything unexpected (test scripts, node_modules, lockfiles), update the `files` whitelist in the offending `package.json` before publishing.

### 3. Publish in dependency order

**Order matters.** `@papervault/cli` resolves `^0.1.0` of `@papervault/core` from the registry — so `core` must exist before `cli` can install elsewhere.

```bash
(cd papervault-core && npm publish)
(cd papervault-cli  && npm publish)
(cd papervault-mcp  && npm publish)
(cd papervault-init && npm publish)
```

Each uses the `publishConfig.access = "public"` set in `package.json`, so no `--access public` flag needed.

### 4. Tag the release

```bash
git tag v0.1.0
git push --tags
```

### 5. Restore `file:` deps for continued local development

```bash
node scripts/publish-prep.js restore
```

This swaps the internal `^0.1.0` deps back to `file:../<package>` so local edits propagate without a publish round-trip. After running it:

```bash
(cd papervault-cli  && npm install)   # refresh the file: symlinks
(cd papervault-mcp  && npm install)
(cd papervault-init && npm install)
```

## Status / sanity check anytime

```bash
node scripts/publish-prep.js status
```

Shows current versions across all packages and whether each internal dep is using `file:` or a version range. Use this if you're not sure whether you're in "ready to publish" or "ready to develop" state.

## What gets published

Each package's `files` whitelist limits the tarball to:

- `src/` — the code
- `README.md`
- `LICENSE`
- `package.json` (always included)

Everything else (`node_modules/`, `package-lock.json`, test scripts, etc.) is excluded. Confirm via `pack-check` before each release.

## Troubleshooting

**`E403 Forbidden` on publish** — Usually means the scope isn't yours, or you forgot `npm login`. Run `npm whoami` to check.

**`@papervault/cli` install fails after publish with `ENOENT`** — Means `@papervault/core` wasn't published first, or hasn't propagated yet. Wait a minute or republish core.

**`prepare` complains about missing LICENSE/README** — One of the packages is missing the file or the `publishConfig`. The error message names which package and which field.

**`restore` left an `npm install` warning about missing peers** — Run `npm install` inside each modified package directory to refresh symlinks.

**Want to unpublish a bad version** — `npm unpublish @papervault/cli@0.1.0` within 72 hours of publish. Beyond that, deprecate instead: `npm deprecate @papervault/cli@0.1.0 "use 0.1.1+"`.

## Verification after publishing

```bash
# In a scratch directory, install from npm and run the wizard
mkdir /tmp/papervault-install-test && cd /tmp/papervault-install-test
npx @papervault/init --help
```

If `--help` renders correctly, the install path works end-to-end. To do a full round-trip:

```bash
echo '{"vaultName":"Install Test","secrets":[{"kind":"password","service":"GH","password":"test"}]}' \
  | npx @papervault/cli backup --threshold 1 --shares 1 --no-print --yes --save /tmp/install-test-kit
```

You should see one HTML kit written to `/tmp/install-test-kit/vault-XXXXXX/`.
