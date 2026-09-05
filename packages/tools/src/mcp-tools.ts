import { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';
import { MCPClientManager, MCPServer } from './mcp-client';

/**
 * Tool to list available tools from MCP servers
 */
export class MCPListToolsTool extends Tool {
  private manager: MCPClientManager;

  constructor(manager: MCPClientManager) {
    super();
    this.manager = manager;
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'mcp_list_tools',
      description: 'List available tools from a connected MCP server',
      parameters: {
        type: 'object',
        properties: {
          server: {
            type: 'string',
            description: 'Name of the MCP server to query',
            required: true,
          },
        },
        required: ['server'],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const { server } = args;

      if (!server || typeof server !== 'string') {
        return {
          success: false,
          error: 'Missing or invalid "server" parameter',
        };
      }

      const client = this.manager.getClient(server);
      if (!client) {
        return {
          success: false,
          error: `MCP server not found: ${server}. Available servers: ${this.manager.listServers().join(', ')}`,
        };
      }

      const response = await client.listTools();

      return {
        success: true,
        output: JSON.stringify(response.tools, null, 2),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Tool to invoke tools on MCP servers
 */
export class MCPCallToolTool extends Tool {
  private manager: MCPClientManager;

  constructor(manager: MCPClientManager) {
    super();
    this.manager = manager;
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'mcp_call_tool',
      description: 'Invoke a tool on a connected MCP server',
      parameters: {
        type: 'object',
        properties: {
          server: {
            type: 'string',
            description: 'Name of the MCP server',
            required: true,
          },
          tool: {
            type: 'string',
            description: 'Name of the tool to invoke',
            required: true,
          },
          arguments: {
            type: 'object',
            description: 'Arguments to pass to the tool',
          },
        },
        required: ['server', 'tool'],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const { server, tool, arguments: toolArgs } = args;

      if (!server || typeof server !== 'string') {
        return {
          success: false,
          error: 'Missing or invalid "server" parameter',
        };
      }

      if (!tool || typeof tool !== 'string') {
        return {
          success: false,
          error: 'Missing or invalid "tool" parameter',
        };
      }

      const client = this.manager.getClient(server);
      if (!client) {
        return {
          success: false,
          error: `MCP server not found: ${server}. Available servers: ${this.manager.listServers().join(', ')}`,
        };
      }

      const result = await client.callTool(tool, toolArgs || {});

      if (result.isError) {
        return {
          success: false,
          error: result.content.map(c => c.text).join('\n'),
        };
      }

      // Format output from content array
      const output = result.content
        .map(c => {
          if (c.type === 'text') {
            return c.text || '';
          } else if (c.type === 'image') {
            return `[Image: ${c.mimeType || 'unknown'}]`;
          } else if (c.type === 'resource') {
            return `[Resource: ${c.mimeType || 'unknown'}]`;
          }
          return '';
        })
        .join('\n');

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
