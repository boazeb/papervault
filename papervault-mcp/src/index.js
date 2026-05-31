#!/usr/bin/env node
// Stdio entry point for the PaperVault MCP server.
// Agents (Claude Code, Cursor, etc.) connect over stdio and call our tools.

import { serve } from './server.js';

serve().catch(err => {
    // MCP runs over stdio so any non-protocol output goes to stderr only.
    process.stderr.write(`papervault-mcp fatal: ${err.message}\n`);
    if (process.env.PAPERVAULT_MCP_DEBUG) {
        process.stderr.write(err.stack + '\n');
    }
    process.exit(1);
});
