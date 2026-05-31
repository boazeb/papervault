#!/usr/bin/env node
// Thin wrapper around `papervault init` so `npx @papervault/init` works
// without first installing the full CLI globally. Following the
// create-react-app / create-next-app convention.
//
// Everything beyond the bin entry lives in @papervault/cli; this package
// exists so the npx command is short and discoverable.

import { init } from '@papervault/cli/commands/init.js';

init(process.argv.slice(2)).catch(err => {
    process.stderr.write(`papervault-init: ${err.message}\n`);
    if (process.env.PAPERVAULT_DEBUG) process.stderr.write(err.stack + '\n');
    process.exit(1);
});
