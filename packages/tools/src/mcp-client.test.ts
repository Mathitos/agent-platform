import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPClient, MCPClientManager, MCPServer, MCPMessage } from './mcp-client';
import { ChildProcess } from 'child_process';
import { Readable, Writable } from 'stream';

// Mock child_process using vi.hoisted
const mockSpawn = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => ({
  spawn: mockSpawn,
}));

// Mock fetch for HTTP transport
global.fetch = vi.fn();

describe('MCPClient', () => {
  let mockProcess: Partial<ChildProcess>;
  let mockStdin: Writable;
  let mockStdout: Readable;

  beforeEach(() => {
    // Create mock streams
    mockStdin = new Writable({
      write(chunk, encoding, callback) {
        callback();
        return true;
      },
    });

    mockStdout = new Readable({
      read() {},
    });

    mockProcess = {
      stdin: mockStdin,
      stdout: mockStdout,
      stderr: new Readable({ read() {} }),
      kill: vi.fn(),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => mockProcess as ChildProcess),
    } as any;

    mockSpawn.mockReturnValue(mockProcess);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('stdio transport', () => {
    it('should initialize with stdio transport', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'stdio',
        command: 'test-mcp-server',
        args: ['--port', '8080'],
      };

      const client = new MCPClient(server);

      // Mock the initialization response
      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            serverInfo: { name: 'test', version: '1.0' },
          },
        }) + '\n');
      }, 10);

      await client.initialize();

      expect(mockSpawn).toHaveBeenCalledWith('test-mcp-server', ['--port', '8080'], expect.any(Object));
    });

    it('should handle initialize failure', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'stdio',
        command: 'test-mcp-server',
      };

      const client = new MCPClient(server);

      // Mock error response
      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32000,
            message: 'Initialization failed',
          },
        }) + '\n');
      }, 10);

      await expect(client.initialize()).rejects.toThrow('Initialization failed');
    });

    it('should list tools via stdio', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'stdio',
        command: 'test-mcp-server',
      };

      const client = new MCPClient(server);

      // Mock initialize response
      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { protocolVersion: '2024-11-05', capabilities: {} },
        }) + '\n');
      }, 10);

      await client.initialize();

      // Mock listTools response
      const listToolsPromise = client.listTools();
      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          result: {
            tools: [
              {
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: {
                  type: 'object',
                  properties: {
                    input: { type: 'string' },
                  },
                },
              },
            ],
          },
        }) + '\n');
      }, 10);

      const result = await listToolsPromise;

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('test_tool');
    });

    it('should call a tool via stdio', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'stdio',
        command: 'test-mcp-server',
      };

      const client = new MCPClient(server);

      // Mock initialize response
      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { protocolVersion: '2024-11-05', capabilities: {} },
        }) + '\n');
      }, 10);

      await client.initialize();

      // Mock callTool response
      const callToolPromise = client.callTool('test_tool', { input: 'hello' });
      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          result: {
            content: [
              { type: 'text', text: 'Tool executed successfully' },
            ],
          },
        }) + '\n');
      }, 10);

      const result = await callToolPromise;

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe('Tool executed successfully');
    });

    it('should handle tool call errors', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'stdio',
        command: 'test-mcp-server',
      };

      const client = new MCPClient(server);

      // Mock initialize response
      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { protocolVersion: '2024-11-05', capabilities: {} },
        }) + '\n');
      }, 10);

      await client.initialize();

      // Mock error response
      const callToolPromise = client.callTool('bad_tool', {});
      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          error: {
            code: -32000,
            message: 'Tool not found',
          },
        }) + '\n');
      }, 10);

      await expect(callToolPromise).rejects.toThrow('Tool not found');
    });

    it('should handle process errors', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'stdio',
        command: 'test-mcp-server',
      };

      const client = new MCPClient(server);

      // Capture error handler
      let errorHandler: (error: Error) => void = () => {};
      mockProcess.on = vi.fn((event: string, handler: any) => {
        if (event === 'error') {
          errorHandler = handler as (error: Error) => void;
        }
        return mockProcess as ChildProcess;
      }) as any;

      // Send the initialize response
      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { protocolVersion: '2024-11-05', capabilities: {} },
        }) + '\n');
      }, 10);

      await client.initialize();

      // Trigger error after initialization to test error handling
      // The error handler should reject pending requests
      const listPromise = client.listTools();
      
      setTimeout(() => {
        errorHandler(new Error('Process spawn error'));
      }, 5);

      await expect(listPromise).rejects.toThrow('Process spawn error');
    });

    it('should cleanup on shutdown', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'stdio',
        command: 'test-mcp-server',
      };

      const client = new MCPClient(server);

      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { protocolVersion: '2024-11-05', capabilities: {} },
        }) + '\n');
      }, 10);

      await client.initialize();
      await client.shutdown();

      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('should throw error if command is missing', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'stdio',
      };

      const client = new MCPClient(server);

      await expect(client.initialize()).rejects.toThrow('stdio transport requires command');
    });
  });

  describe('http transport', () => {
    beforeEach(() => {
      (global.fetch as any).mockClear();
    });

    it('should initialize with http transport', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'http',
        url: 'http://localhost:8080/mcp',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {},
          },
        }),
      });

      const client = new MCPClient(server);
      await client.initialize();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/mcp',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should list tools via http', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'http',
        url: 'http://localhost:8080/mcp',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: { protocolVersion: '2024-11-05', capabilities: {} },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 2,
            result: {
              tools: [
                { name: 'http_tool', description: 'HTTP test tool' },
              ],
            },
          }),
        });

      const client = new MCPClient(server);
      const result = await client.listTools();

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('http_tool');
    });

    it('should call a tool via http', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'http',
        url: 'http://localhost:8080/mcp',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: { protocolVersion: '2024-11-05', capabilities: {} },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: 2,
            result: {
              content: [
                { type: 'text', text: 'HTTP tool result' },
              ],
            },
          }),
        });

      const client = new MCPClient(server);
      const result = await client.callTool('http_tool', { param: 'value' });

      expect(result.content[0].text).toBe('HTTP tool result');
    });

    it('should handle http errors', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'http',
        url: 'http://localhost:8080/mcp',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new MCPClient(server);

      await expect(client.initialize()).rejects.toThrow('HTTP request failed: 500 Internal Server Error');
    });

    it('should throw error if url is missing', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'http',
      };

      const client = new MCPClient(server);

      await expect(client.initialize()).rejects.toThrow('http transport requires url');
    });
  });

  describe('error handling', () => {
    it('should handle malformed json responses', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'stdio',
        command: 'test-mcp-server',
      };

      const client = new MCPClient(server);

      // Send valid init response first
      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { protocolVersion: '2024-11-05', capabilities: {} },
        }) + '\n');
        // Then send malformed json (should be handled gracefully)
        mockStdout.push('not valid json\n');
      }, 10);

      await client.initialize();
    });

    it('should timeout on long requests', async () => {
      const server: MCPServer = {
        name: 'test-server',
        transport: 'stdio',
        command: 'test-mcp-server',
      };

      const client = new MCPClient(server);

      setTimeout(() => {
        mockStdout.push(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { protocolVersion: '2024-11-05', capabilities: {} },
        }) + '\n');
      }, 10);

      await client.initialize();

      // Don't send a response - should timeout
      await expect(client.listTools()).rejects.toThrow('Request timeout');
    }, 35000);
  });
});

describe('MCPClientManager', () => {
  it('should register servers', () => {
    const manager = new MCPClientManager();
    const server: MCPServer = {
      name: 'test-server',
      transport: 'stdio',
      command: 'test-mcp',
    };

    manager.registerServer(server);

    expect(manager.listServers()).toContain('test-server');
  });

  it('should get client by name', () => {
    const manager = new MCPClientManager();
    const server: MCPServer = {
      name: 'test-server',
      transport: 'stdio',
      command: 'test-mcp',
    };

    manager.registerServer(server);
    const client = manager.getClient('test-server');

    expect(client).toBeDefined();
  });

  it('should return undefined for unknown server', () => {
    const manager = new MCPClientManager();
    const client = manager.getClient('unknown');

    expect(client).toBeUndefined();
  });

  it('should list all servers', () => {
    const manager = new MCPClientManager();

    manager.registerServer({ name: 'server1', transport: 'stdio', command: 'cmd1' });
    manager.registerServer({ name: 'server2', transport: 'http', url: 'http://localhost' });

    const servers = manager.listServers();

    expect(servers).toHaveLength(2);
    expect(servers).toContain('server1');
    expect(servers).toContain('server2');
  });

  it('should shutdown all clients', async () => {
    const manager = new MCPClientManager();

    manager.registerServer({ name: 'server1', transport: 'stdio', command: 'cmd1' });
    manager.registerServer({ name: 'server2', transport: 'stdio', command: 'cmd2' });

    await manager.shutdownAll();

    expect(manager.listServers()).toHaveLength(0);
  });

  it('should create client via static helper', () => {
    const server: MCPServer = {
      name: 'test-server',
      transport: 'stdio',
      command: 'test-mcp',
    };

    const client = MCPClientManager.createClient(server);

    expect(client).toBeDefined();
  });
});
