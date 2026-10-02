/** Integrated EOS excludes the already disabled Assist/MCP execution surface. */
export interface OpenAiFunctionTool {
    type: 'function';
    function: { name: string; description?: string; parameters: Record<string, unknown> };
}
export interface McpClientManagerOptions {
    defaultUser?: `system.user.${string}`;
    language?: ioBroker.Languages;
    allowSetState?: boolean;
    allowObjectChange?: boolean;
}
export class McpClientManager {
    constructor(_adapter: ioBroker.Adapter, _options: McpClientManagerOptions = {}) {}
    async getTools(): Promise<OpenAiFunctionTool[]> { throw new Error('EOS_ASSIST_NOT_INCLUDED'); }
    async callTool(_name: string, _args?: Record<string, unknown>): Promise<{ text: string; isError: boolean }> {
        throw new Error('EOS_ASSIST_NOT_INCLUDED');
    }
    async close(): Promise<void> {}
}
