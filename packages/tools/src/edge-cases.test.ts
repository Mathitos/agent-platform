import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitOperations, GitRunner } from './git-runner';
import { GhOperations, GhRunner } from './gh-runner';
import { MCPClient, MCPServer, MCPClientManager } from './mcp-client';
import { GitCommitTool, GitStatusTool, GitDiffTool } from './git-tools';
import { PRCreateTool, PRViewTool } from './pr-tools';
import { MCPCallToolTool, MCPListToolsTool } from './mcp-tools';
import { ToolExecutionContext } from './types';
import { Readable, Writable } from 'stream';
import { ChildProcess } from 'child_process';

/**
 * Edge Case Tests
 * 
 * Tests for unusual but valid scenarios: empty repos, network failures,
 * concurrent operations, malformed responses, timeouts, etc.
 */

const mockSpawn = vi.hoisted(() => vi.fn());
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    spawn: mockSpawn,
  };
});

describe('Edge Case Tests - Git Operations', () => {
  let mockGitRunner: GitRunner;
  let context: ToolExecutionContext;

  beforeEach(() => {
    context = {
      workspaceRoot: '/test/workspace',
      userId: 'test-user',
      trustedPaths: [],
    };

    mockGitRunner = {
      exec: vi.fn(),
    };

    GitOperations.setRunner(mockGitRunner);
  });

  afterEach(() => {
    GitOperations.resetRunner();
  });

  it('should handle empty git repository (no commits)', async () => {
    const tool = new GitStatusTool();

    (mockGitRunner.exec as any)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
      .mockResolvedValueOnce({
        stdout: '## No commits yet on main\n?? file.txt',
        stderr: '',
        exitCode: 0,
      });

    const result = await tool.execute({}, context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('No commits yet');
  });

  it('should handle git merge conflicts gracefully', async () => {
    const tool = new GitStatusTool();

    (mockGitRunner.exec as any)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
      .mockResolvedValueOnce({
        stdout: '## main\nUU conflicted-file.txt\n',
        stderr: '',
        exitCode: 0,
      });

    const result = await tool.execute({}, context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('UU'); // Unmerged status
  });

  it('should handle nothing to commit scenario', async () => {
    const tool = new GitCommitTool();

    (mockGitRunner.exec as any)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
      .mockResolvedValueOnce({
        stdout: '',
        stderr: 'nothing to commit, working tree clean',
        exitCode: 1,
      });

    const result = await tool.execute({ message: 'Test' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('nothing to commit');
  });

  it('should handle git diff with binary files', async () => {
    const tool = new GitDiffTool();

    (mockGitRunner.exec as any)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
      .mockResolvedValueOnce({
        stdout: 'Binary files a/image.png and b/image.png differ',
        stderr: '',
        exitCode: 0,
      });

    const result = await tool.execute({}, context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('Binary files');
  });

  it('should handle very large git diff output', async () => {
    const tool = new GitDiffTool();

    const largeDiff = 'diff --git a/large.txt b/large.txt\n' + 
                      '+' + 'x'.repeat(5 * 1024 * 1024); // 5MB diff

    (mockGitRunner.exec as any)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
      .mockResolvedValueOnce({
        stdout: largeDiff,
        stderr: '',
        exitCode: 0,
      });

    const result = await tool.execute({}, context);

    expect(result.success).toBe(true);
    expect(result.output?.length).toBeGreaterThan(1024 * 1024);
  });

  it('should handle empty git diff (no changes)', async () => {
    const tool = new GitDiffTool();

    (mockGitRunner.exec as any)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

    const result = await tool.execute({}, context);

    expect(result.success).toBe(true);
    expect(result.output).toBe('No changes');
  });

  it('should handle git operation in detached HEAD state', async () => {
    const tool = new GitStatusTool();

    (mockGitRunner.exec as any)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
      .mockResolvedValueOnce({
        stdout: '## HEAD (no branch)\nM file.txt',
        stderr: '',
        exitCode: 0,
      });

    const result = await tool.execute({}, context);

    expect(result.success).toBe(true);
    expect(result.output).toContain('HEAD (no branch)');
  });
});

describe('Edge Case Tests - PR Operations', () => {
  let mockGhRunner: GhRunner;
  let context: ToolExecutionContext;

  beforeEach(() => {
    context = {
      workspaceRoot: '/test/workspace',
      userId: 'test-user',
      trustedPaths: [],
    };

    mockGhRunner = {
      exec: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    GhOperations.setRunner(mockGhRunner);
  });

  afterEach(() => {
    GhOperations.resetRunner();
  });

  it('should handle gh CLI not in PATH', async () => {
    const tool = new PRCreateTool();

    (mockGhRunner.isAvailable as any).mockResolvedValueOnce(false);

    const result = await tool.execute(
      { title: 'Test', body: 'Body' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('GitHub CLI (gh) is not installed');
    expect(result.error).toContain('https://cli.github.com/');
  });

  it('should handle GitHub API rate limit errors', async () => {
    const tool = new PRCreateTool();

    (mockGhRunner.exec as any).mockResolvedValueOnce({
      stdout: '',
      stderr: 'API rate limit exceeded for user',
      exitCode: 1,
    });

    const result = await tool.execute(
      { title: 'Test', body: 'Body' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('API rate limit exceeded');
  });

  it('should handle malformed JSON from gh pr view', async () => {
    const tool = new PRViewTool();

    (mockGhRunner.exec as any).mockResolvedValueOnce({
      stdout: 'not valid json {truncated',
      stderr: '',
      exitCode: 0,
    });

    const result = await tool.execute({}, context);

    // Should return the raw output even if JSON is malformed
    expect(result.success).toBe(true);
    expect(result.output).toContain('not valid json');
  });

  it('should handle network timeout during PR creation', async () => {
    const tool = new PRCreateTool();

    (mockGhRunner.exec as any).mockRejectedValueOnce(
      new Error('ETIMEDOUT: network timeout')
    );

    const result = await tool.execute(
      { title: 'Test', body: 'Body' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('ETIMEDOUT');
  });

  it('should handle PR creation when not in a git repository', async () => {
    const tool = new PRCreateTool();

    (mockGhRunner.exec as any).mockResolvedValueOnce({
      stdout: '',
      stderr: 'fatal: not a git repository',
      exitCode: 1,
    });

    const result = await tool.execute(
      { title: 'Test', body: 'Body' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('not a git repository');
  });

  it('should handle empty PR list response', async () => {
    const tool = new PRViewTool();

    (mockGhRunner.exec as any).mockResolvedValueOnce({
      stdout: '',
      stderr: 'no pull requests found',
      exitCode: 1,
    });

    const result = await tool.execute({}, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('no pull requests found');
  });
});

describe('Edge Case Tests - MCP Operations', () => {
  let mockStdin: Writable;
  let mockStdout: Readable;
  let mockProcess: Partial<ChildProcess>;
  let context: ToolExecutionContext;

  beforeEach(() => {
    context = {
      workspaceRoot: '/test/workspace',
      userId: 'test-user',
      trustedPaths: [],
    };

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
      on: vi.fn((event: string, handler: any) => mockProcess as ChildProcess),
    } as any;

    mockSpawn.mockReturnValue(mockProcess);
    vi.clearAllMocks();
  });

  it('should handle MCP server crash during operation', async () => {
    const server: MCPServer = {
      name: 'test-server',
      transport: 'stdio',
      command: 'test-mcp',
    };

    const client = new MCPClient(server);

    // Send init response
    setTimeout(() => {
      mockStdout.push(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { protocolVersion: '2024-11-05', capabilities: {} },
      }) + '\n');
    }, 10);

    await client.initialize();

    // Now simulate crash
    const listPromise = client.listTools();

    setTimeout(() => {
      const exitHandler = (mockProcess.on as any).mock.calls.find(
        (call: any) => call[0] === 'exit'
      )?.[1];
      if (exitHandler) {
        exitHandler(1); // Non-zero exit
      }
    }, 10);

    await expect(listPromise).rejects.toThrow();
  });

  it('should handle multiple concurrent MCP tool calls', async () => {
    const manager = new MCPClientManager();
    const server: MCPServer = {
      name: 'test-server',
      transport: 'http',
      url: 'http://localhost:8080',
    };

    manager.registerServer(server);
    const tool = new MCPCallToolTool(manager);

    // Mock multiple concurrent responses
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: callCount,
          result: {
            content: [{ type: 'text', text: `Result ${callCount}` }],
          },
        }),
      };
    });

    const mockClient = {
      initialize: vi.fn().mockResolvedValue(undefined),
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Result' }],
      }),
      shutdown: vi.fn(),
    };

    (manager as any).clients.set('test-server', mockClient);

    // Execute multiple tools concurrently
    const promises = [
      tool.execute({ server: 'test-server', tool: 'tool1' }, context),
      tool.execute({ server: 'test-server', tool: 'tool2' }, context),
      tool.execute({ server: 'test-server', tool: 'tool3' }, context),
    ];

    const results = await Promise.all(promises);

    // All should succeed
    expect(results.every(r => r.success)).toBe(true);
  });

  it('should handle MCP server returning empty tools list', async () => {
    const manager = new MCPClientManager();
    const tool = new MCPListToolsTool(manager);

    const mockClient = {
      listTools: vi.fn().mockResolvedValue({ tools: [] }),
    };

    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute({ server: 'test-server' }, context);

    expect(result.success).toBe(true);
    expect(result.output).toBe('[]');
  });

  it('should handle MCP tool returning multiple content types', async () => {
    const manager = new MCPClientManager();
    const tool = new MCPCallToolTool(manager);

    const mockClient = {
      callTool: vi.fn().mockResolvedValue({
        content: [
          { type: 'text', text: 'Text content' },
          { type: 'image', data: 'base64data', mimeType: 'image/png' },
          { type: 'resource', mimeType: 'application/json' },
          { type: 'text', text: 'More text' },
        ],
        isError: false,
      }),
    };

    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute(
      { server: 'test-server', tool: 'multi_tool' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain('Text content');
    expect(result.output).toContain('[Image: image/png]');
    expect(result.output).toContain('[Resource: application/json]');
    expect(result.output).toContain('More text');
  });

  it('should handle MCP HTTP connection refused', async () => {
    const server: MCPServer = {
      name: 'test-server',
      transport: 'http',
      url: 'http://localhost:9999',
    };

    const client = new MCPClient(server);

    global.fetch = vi.fn().mockRejectedValueOnce(
      new Error('ECONNREFUSED: Connection refused')
    );

    await expect(client.initialize()).rejects.toThrow('ECONNREFUSED');
  });

  it('should handle MCP response with very large payload', async () => {
    const manager = new MCPClientManager();
    const tool = new MCPListToolsTool(manager);

    // Create a tools list with 1000 tools
    const manyTools = Array.from({ length: 1000 }, (_, i) => ({
      name: `tool_${i}`,
      description: `Description for tool ${i}`,
      inputSchema: {
        type: 'object',
        properties: {
          param: { type: 'string' },
        },
      },
    }));

    const mockClient = {
      listTools: vi.fn().mockResolvedValue({ tools: manyTools }),
    };

    (manager as any).clients.set('test-server', mockClient);

    const result = await tool.execute({ server: 'test-server' }, context);

    expect(result.success).toBe(true);
    const tools = JSON.parse(result.output!);
    expect(tools).toHaveLength(1000);
  });

  it('should handle MCP shutdown with pending requests', async () => {
    const manager = new MCPClientManager();
    const server: MCPServer = {
      name: 'test-server',
      transport: 'stdio',
      command: 'test-mcp',
    };

    manager.registerServer(server);

    // Mock a client with slow operations
    const mockClient = {
      listTools: vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => 
          resolve({ tools: [] }), 1000)
        )
      ),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    (manager as any).clients.set('test-server', mockClient);

    const tool = new MCPListToolsTool(manager);

    // Start operation but don't await
    const promise = tool.execute({ server: 'test-server' }, context);

    // Shutdown immediately
    await manager.shutdownAll();

    // Original operation should still complete or reject
    try {
      await promise;
    } catch (e) {
      // Either succeeds or fails, but shouldn't hang
      expect(e).toBeDefined();
    }

    expect(mockClient.shutdown).toHaveBeenCalled();
  });

  it('should handle MCP server sending invalid JSON-RPC structure', async () => {
    const server: MCPServer = {
      name: 'test-server',
      transport: 'stdio',
      command: 'test-mcp',
    };

    const client = new MCPClient(server);

    // Send invalid JSON-RPC (missing jsonrpc field)
    setTimeout(() => {
      mockStdout.push(JSON.stringify({
        id: 1,
        result: { tools: [] },
      }) + '\n');
    }, 10);

    await client.initialize();

    // Client should handle gracefully even if protocol is violated
    expect(client).toBeDefined();
  });
});

describe('Edge Case Tests - Concurrent Operations', () => {
  let mockGitRunner: GitRunner;
  let context: ToolExecutionContext;

  beforeEach(() => {
    context = {
      workspaceRoot: '/test/workspace',
      userId: 'test-user',
      trustedPaths: [],
    };

    mockGitRunner = {
      exec: vi.fn().mockImplementation(async () => {
        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 50));
        return { stdout: 'output', stderr: '', exitCode: 0 };
      }),
    };

    GitOperations.setRunner(mockGitRunner);
  });

  afterEach(() => {
    GitOperations.resetRunner();
  });

  it('should handle concurrent git status calls', async () => {
    (mockGitRunner.exec as any)
      .mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

    const tool = new GitStatusTool();

    // Execute multiple status checks concurrently
    const promises = Array.from({ length: 10 }, () =>
      tool.execute({}, context)
    );

    const results = await Promise.all(promises);

    // All should succeed
    expect(results.every(r => r.success)).toBe(true);
  });
});
