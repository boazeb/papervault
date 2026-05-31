#!/usr/bin/env node
import { main } from './cli.js';

main(process.argv.slice(2)).catch(err => {
    process.stderr.write(`papervault: ${err.message}\n`);
    if (process.env.PAPERVAULT_DEBUG) {
        process.stderr.write(err.stack + '\n');
    }
    process.exit(1);
});
