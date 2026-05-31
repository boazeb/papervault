import { parseArgs } from 'node:util';
import { SUPPORTED_SOURCES } from '../sources/index.js';

const HELP = `papervault sources — manage and inspect source backends

Usage:
  papervault sources list      List all supported source URI schemes
`;

export async function sourcesCmd(argv) {
    const { positionals } = parseArgs({ args: argv, allowPositionals: true });
    const sub = positionals[0];

    if (!sub || sub === 'list') {
        const colWidth = Math.max(...SUPPORTED_SOURCES.map(s => s.scheme.length)) + 2;
        for (const s of SUPPORTED_SOURCES) {
            const status = s.status === 'ready' ? '✓ ready  ' : '○ roadmap';
            process.stdout.write(`  ${status}  ${s.scheme.padEnd(colWidth)}  ${s.description}\n`);
        }
        return;
    }

    process.stderr.write(HELP);
    process.exit(2);
}
