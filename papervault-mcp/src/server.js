// MCP server wiring. Boots the SDK server on stdio and routes tool calls
// to the handlers in tools.js.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
    TOOLS,
    handleBackupFromSource,
    handleDryRun,
    handleListSources,
    handleAuditRecent,
} from './tools.js';

export async function serve() {
    const server = new Server(
        { name: 'papervault', version: '0.1.0' },
        { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOLS,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            switch (name) {
                case 'papervault_backup_from_source': return await handleBackupFromSource(args);
                case 'papervault_dry_run':            return await handleDryRun(args);
                case 'papervault_list_sources':       return await handleListSources();
                case 'papervault_audit_recent':       return await handleAuditRecent(args);
                default:
                    return {
                        content: [{ type: 'text', text: JSON.stringify({ error: `unknown tool: ${name}` }) }],
                        isError: true,
                    };
            }
        } catch (err) {
            // Last-resort error envelope — handlers should normally catch and
            // return their own structured error response.
            return {
                content: [{ type: 'text', text: JSON.stringify({ error: err.message ?? String(err) }) }],
                isError: true,
            };
        }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    // process.stderr only — MUST NOT write to stdout (MCP protocol channel).
    process.stderr.write('papervault-mcp: listening on stdio\n');
}
