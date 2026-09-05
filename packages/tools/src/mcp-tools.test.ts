import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPListToolsTool, MCPCallToolTool } from './mcp-tools';
import { MCPClientManager, MCPClient, MCPServer } from './mcp-client';
import { ToolExecutionContext } from './types';

// Mock MCPClient
vi.mock('./mcp-client', async () => {
  const actual = await vi.importActual('./mcp-client');
  return {
    ...actual,
    MCPClient: vi.fn(),
  };
});

describe('MCPListToolsTool', () => {
  let manager: MCPClientManager;
  let tool: MCPListToolsTool;
  let mockClient: any;
  let context: ToolExecutionContext;

  beforeEach(() => {
    manager = new MCPClientManager();
    tool = new MCPListToolsTool(manager);

    context = {
      workspaceRoot: '/test/workspace',
      userId: 'test-user',
      trustedPaths: [],
    };

    mockClient = {
      initialize: vi.fn().mockResolvedValue(undefined),
      listTools: vi.fn().mockResolvedValue({
        tools: [
          {
            name: 'tool1',
            description: 'First test tool',
            inputSchema: {
              type: 'object',
              properties: {
                param1: { type: 'string' },
              },
            },
          },
          {
            name: 'tool2',
            description: 'Second test tool',
          },
        ],
      }),
      callTool: vi.fn(),
      shutdown: vi.fn(),
    };

    vi.clearAllMocks();
  });

  it('should have correct definition', () => {
    const definition = tool.getDefinition();

    expect(definition.name).toBe('mcp_list_tools');
    expect(definition.description).toContain('List available tools');
    expect(definition.parameters.required).toContain('server');
  });

  it('should list tools from a server', async () => {
    // Register mock client
    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute({ server: 'test-server' }, context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('tool1');
    expect(result.output).toContain('tool2');
    expect(mockClient.listTools).toHaveBeenCalled();
  });

  it('should return error for missing server parameter', async () => {
    const result = await tool.execute({}, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing or invalid "server" parameter');
  });

  it('should return error for invalid server parameter', async () => {
    const result = await tool.execute({ server: 123 }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing or invalid "server" parameter');
  });

  it('should return error for unknown server', async () => {
    const result = await tool.execute({ server: 'unknown-server' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('MCP server not found: unknown-server');
    expect(result.error).toContain('Available servers:');
  });

  it('should handle client errors', async () => {
    mockClient.listTools.mockRejectedValueOnce(new Error('Connection failed'));
    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute({ server: 'test-server' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection failed');
  });

  it('should list available servers in error message', async () => {
    (manager as any).clients.set('server1', mockClient);
    (manager as any).clients.set('server2', mockClient);

    const result = await tool.execute({ server: 'unknown' }, context);

    expect(result.error).toContain('server1');
    expect(result.error).toContain('server2');
  });
});

describe('MCPCallToolTool', () => {
  let manager: MCPClientManager;
  let tool: MCPCallToolTool;
  let mockClient: any;
  let context: ToolExecutionContext;

  beforeEach(() => {
    manager = new MCPClientManager();
    tool = new MCPCallToolTool(manager);

    context = {
      workspaceRoot: '/test/workspace',
      userId: 'test-user',
      trustedPaths: [],
    };

    mockClient = {
      initialize: vi.fn().mockResolvedValue(undefined),
      listTools: vi.fn(),
      callTool: vi.fn().mockResolvedValue({
        content: [
          { type: 'text', text: 'Tool execution result' },
        ],
        isError: false,
      }),
      shutdown: vi.fn(),
    };

    vi.clearAllMocks();
  });

  it('should have correct definition', () => {
    const definition = tool.getDefinition();

    expect(definition.name).toBe('mcp_call_tool');
    expect(definition.description).toContain('Invoke a tool');
    expect(definition.parameters.required).toContain('server');
    expect(definition.parameters.required).toContain('tool');
  });

  it('should call a tool on a server', async () => {
    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute(
      {
        server: 'test-server',
        tool: 'test_tool',
        arguments: { param1: 'value1' },
      },
      context
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain('Tool execution result');
    expect(mockClient.callTool).toHaveBeenCalledWith('test_tool', { param1: 'value1' });
  });

  it('should call a tool without arguments', async () => {
    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute(
      {
        server: 'test-server',
        tool: 'test_tool',
      },
      context
    );

    expect(result.success).toBe(true);
    expect(mockClient.callTool).toHaveBeenCalledWith('test_tool', {});
  });

  it('should return error for missing server parameter', async () => {
    const result = await tool.execute({ tool: 'test_tool' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing or invalid "server" parameter');
  });

  it('should return error for missing tool parameter', async () => {
    const result = await tool.execute({ server: 'test-server' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing or invalid "tool" parameter');
  });

  it('should return error for unknown server', async () => {
    const result = await tool.execute(
      { server: 'unknown-server', tool: 'test_tool' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('MCP server not found: unknown-server');
  });

  it('should handle tool execution errors', async () => {
    mockClient.callTool.mockResolvedValueOnce({
      content: [
        { type: 'text', text: 'Tool failed: invalid input' },
      ],
      isError: true,
    });
    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute(
      { server: 'test-server', tool: 'bad_tool' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tool failed: invalid input');
  });

  it('should handle client errors', async () => {
    mockClient.callTool.mockRejectedValueOnce(new Error('Connection lost'));
    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute(
      { server: 'test-server', tool: 'test_tool' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection lost');
  });

  it('should format multiple content items', async () => {
    mockClient.callTool.mockResolvedValueOnce({
      content: [
        { type: 'text', text: 'First line' },
        { type: 'text', text: 'Second line' },
      ],
      isError: false,
    });
    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute(
      { server: 'test-server', tool: 'test_tool' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain('First line');
    expect(result.output).toContain('Second line');
  });

  it('should handle image content', async () => {
    mockClient.callTool.mockResolvedValueOnce({
      content: [
        { type: 'image', data: 'base64data', mimeType: 'image/png' },
      ],
      isError: false,
    });
    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute(
      { server: 'test-server', tool: 'image_tool' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain('[Image: image/png]');
  });

  it('should handle resource content', async () => {
    mockClient.callTool.mockResolvedValueOnce({
      content: [
        { type: 'resource', mimeType: 'application/json' },
      ],
      isError: false,
    });
    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute(
      { server: 'test-server', tool: 'resource_tool' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain('[Resource: application/json]');
  });
});
