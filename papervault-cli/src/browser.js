// Cross-platform "open URL in default browser".
// Doesn't shell out for the URL itself — uses spawn with no shell.

import { spawn } from 'node:child_process';

export function openUrl(url) {
    const platform = process.platform;
    let cmd, args;
    if (platform === 'darwin') {
        cmd = 'open';
        args = [url];
    } else if (platform === 'win32') {
        cmd = 'cmd';
        args = ['/c', 'start', '', url];
    } else {
        cmd = 'xdg-open';
        args = [url];
    }
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.unref();
    child.on('error', err => {
        process.stderr.write(`Could not open browser automatically (${err.message}). Open this URL: ${url}\n`);
    });
}
