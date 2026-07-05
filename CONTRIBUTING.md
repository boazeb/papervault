# Contributing to PaperVault

Thanks for helping improve PaperVault.

PaperVault is a securitase keep contributions small, well-tested, and careful with anything that touches encryption, key generation, QR output, printing, or vault recovery.

## Before you start

* Read the README and SECURITY.md.
* Check existing issues and pull requests before opening a new one.
* Do not include real secrets, passwords, seed phrases, recovery codes, or private keys in issues, commits, screenshots, or test data.

## Project setup

PaperVault runs as a React app and uses Node.js 24 or newer.

```bash
git clone https://github.com/boazeb/papervault.git
cd papervault
npm install
npm start
```

Available scripts:

```bash
npm start
npm run build
npm test
```

## Where to contribute

The repository includes the main app plus supporting areas such as the CLI, core library, init flow, and MCP tooling. Good contributions include:

* Bug fixes
* UI and accessibility improvements
* Test coverage
* Documentation updates
* Security hardening
* Small refactors that improve reliability

## Workflow

1. Fork the repository.
2. Create a branch with a clear name.

   * Example: `fix-qr-print-layout`
   * Example: `docs-contributing-guide`
3. Make your changes.
4. Test locally.
5. Open a pull request.

## Code style

* Keep changes focused and easy to review.
* Match the existing code style in the files you edit.
* Prefer readable, simple code over clever code.
* Add comments only when they help explain non-obvious logic.
* Do not introduce new dependencies unless they are necessary.

## Testing

Before opening a pull request, make sure:

* The app starts successfully.
* Your change works in the browser.
* Existing behavior still works.
* Any new logic has tests where practical.

For security-sensitive changes, test with non-sensitive sample data only.

## Pull request guidelines

Please include:

* A short description of the change
* Why the change is needed
* Screenshots or screen recordings for UI updates
* Testing notes
* Any security or compatibility impact

Keep pull requests small when possible. Large changes are easier to review when split into smaller parts.

## Reporting security issues

Do not open public issues for security vulnerabilities. Follow the process in `SECURITY.md` instead.

## Code of conduct

Be respectful, constructive, and helpful in discussions and reviews.

Thanks again for contributing to PaperVault.
