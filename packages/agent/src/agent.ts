import {
  ProviderAdapter,
  Message,
  ToolDefinition as ProviderToolDef,
  ToolCall,
} from '@loom/core';
import {
  Tool,
  ToolExecutionContext,
  FileReadTool,
  FileWriteTool,
  ShellTool,
  MemoryTool,
  MCPClientManager,
  MCPServer,
  MCPListToolsTool,
  MCPCallToolTool,
  GitStatusTool,
  GitDiffTool,
  GitCommitTool,
  GitBranchInfoTool,
  PRCreateTool,
  PRViewTool,
  PRListTool,
} from '@loom/tools';

export interface AgentConfig {
  workspaceRoot: string;
  userId?: string;
  trustedPaths?: string[];
  maxIterations?: number;
  mcpServers?: MCPServer[];
  enableGitTools?: boolean;
  enablePRTools?: boolean;
}

export interface AgentTurn {
  messages: Message[];
  toolCalls: number;
  iterations: number;
}

export class AgentExecutor {
  private provider: ProviderAdapter;
  private tools: Map<string, Tool>;
  private context: ToolExecutionContext;
  private maxIterations: number;
  private mcpManager?: MCPClientManager;

  constructor(provider: ProviderAdapter, config: AgentConfig) {
    this.provider = provider;
    this.maxIterations = config.maxIterations || 10;

    // Initialize tools
    this.tools = new Map();
    this.registerTool(new FileReadTool());
    this.registerTool(new FileWriteTool());
    this.registerTool(new ShellTool());
    this.registerTool(new MemoryTool());

    // Register Git tools if enabled (default: true)
    if (config.enableGitTools !== false) {
      this.registerTool(new GitStatusTool());
      this.registerTool(new GitDiffTool());
      this.registerTool(new GitCommitTool());
      this.registerTool(new GitBranchInfoTool());
    }

    // Register PR tools if enabled (default: true)
    if (config.enablePRTools !== false) {
      this.registerTool(new PRCreateTool());
      this.registerTool(new PRViewTool());
      this.registerTool(new PRListTool());
    }

    // Setup MCP servers if configured
    if (config.mcpServers && config.mcpServers.length > 0) {
      this.mcpManager = new MCPClientManager();
      for (const server of config.mcpServers) {
        this.mcpManager.registerServer(server);
      }
      this.registerTool(new MCPListToolsTool(this.mcpManager));
      this.registerTool(new MCPCallToolTool(this.mcpManager));
    }

    // Setup execution context
    this.context = {
      workspaceRoot: config.workspaceRoot,
      userId: config.userId || 'default',
      trustedPaths: config.trustedPaths || [],
    };
  }

  private registerTool(tool: Tool): void {
    this.tools.set(tool.getName(), tool);
  }

  private getToolDefinitions(): ProviderToolDef[] {
    const definitions: ProviderToolDef[] = [];

    for (const tool of this.tools.values()) {
      const def = tool.getDefinition();
      definitions.push({
        type: 'function',
        function: {
          name: def.name,
          description: def.description,
          parameters: def.parameters,
        },
      });
    }

    return definitions;
  }

  async executeTurn(userMessage: string, history: Message[] = []): Promise<AgentTurn> {
    const messages: Message[] = [
      ...history,
      { role: 'user', content: userMessage },
    ];

    let iterations = 0;
    let totalToolCalls = 0;

    while (iterations < this.maxIterations) {
      iterations++;

      // Call provider with tools
      const response = await this.provider.chat({
        messages,
        tools: this.getToolDefinitions(),
      });

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        tool_calls: response.tool_calls,
      };
      messages.push(assistantMessage);

      // If no tool calls, we're done
      if (!response.tool_calls || response.tool_calls.length === 0) {
        break;
      }

      totalToolCalls += response.tool_calls.length;

      // Execute each tool call
      for (const toolCall of response.tool_calls) {
        const result = await this.executeToolCall(toolCall);

        // Add tool result message
        const toolMessage: Message = {
          role: 'tool',
          content: result,
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
        };
        messages.push(toolMessage);
      }

      // Continue loop to let the model process tool results
    }

    return {
      messages,
      toolCalls: totalToolCalls,
      iterations,
    };
  }

  private async executeToolCall(toolCall: ToolCall): Promise<string> {
    try {
      const { name, arguments: argsString } = toolCall.function;

      // Find the tool
      const tool = this.tools.get(name);
      if (!tool) {
        return JSON.stringify({
          success: false,
          error: `Unknown tool: ${name}`,
        });
      }

      // Parse arguments
      let args: Record<string, any>;
      try {
        args = JSON.parse(argsString);
      } catch (parseError) {
        return JSON.stringify({
          success: false,
          error: `Invalid tool arguments: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        });
      }

      // Execute tool
      const result = await tool.execute(args, this.context);

      // Format result for the model
      if (result.success) {
        return result.output || 'Success';
      } else {
        return JSON.stringify({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  static getDefaultTools(): string[] {
    return [
      'read_file',
      'write_file',
      'execute_shell',
      'memory',
      'git_status',
      'git_diff',
      'git_commit',
      'git_branch_info',
      'pr_create',
      'pr_view',
      'pr_list',
    ];
  }

  static getMCPTools(): string[] {
    return ['mcp_list_tools', 'mcp_call_tool'];
  }

  async cleanup(): Promise<void> {
    if (this.mcpManager) {
      await this.mcpManager.shutdownAll();
    }
  }
}
