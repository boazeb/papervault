// Command dispatcher. Each subcommand owns its own argument parsing
// (via util.parseArgs) so flags can vary cleanly per command.

import { backup } from './commands/backup.js';
import { verify } from './commands/verify.js';
import { sourcesCmd } from './commands/sources.js';
import { init } from './commands/init.js';

const HELP = `papervault — disaster-recovery kits from your secret sources

Usage:
  papervault init                        Interactive setup → papervault.config.json
  papervault backup [options]            Generate a printable kit
  papervault verify <path>               Decrypt-check a saved kit
  papervault sources list                Show configured backends
  papervault --help

Run 'papervault <command> --help' for command-specific options.
`;

export async function main(argv) {
    const [command, ...rest] = argv;

    if (!command || command === '--help' || command === '-h') {
        process.stdout.write(HELP);
        return;
    }

    switch (command) {
        case 'init':
            return init(rest);
        case 'backup':
            return backup(rest);
        case 'verify':
            return verify(rest);
        case 'sources':
            return sourcesCmd(rest);
        default:
            process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
            process.exit(2);
    }
}
