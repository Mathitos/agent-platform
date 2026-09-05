import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentExecutor } from './agent';
import {
  ProviderAdapter,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderConfig,
} from '@loom/core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock provider for testing
class MockProvider extends ProviderAdapter {
  private responses: ChatCompletionResponse[] = [];
  private callIndex = 0;

  constructor(responses: ChatCompletionResponse[]) {
    super({ type: 'openai', apiKey: 'test' });
    this.responses = responses;
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (this.callIndex >= this.responses.length) {
      throw new Error('MockProvider: No more responses configured');
    }
    const response = this.responses[this.callIndex];
    this.callIndex++;
    return response;
  }

  getName(): string {
    return 'Mock';
  }
}

describe('AgentExecutor', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-agent-test-'));
  });

  it('should handle simple message without tool calls', async () => {
    const provider = new MockProvider([
      {
        content: 'Hello! How can I help you?',
        tool_calls: undefined,
      },
    ]);

    const agent = new AgentExecutor(provider, {
      workspaceRoot: tempDir,
    });

    const result = await agent.executeTurn('Hi there');

    expect(result.iterations).toBe(1);
    expect(result.toolCalls).toBe(0);
    expect(result.messages).toHaveLength(2); // user + assistant
    expect(result.messages[1].content).toContain('Hello');
  });

  it('should execute file read tool call', async () => {
    // Create test file
    const testFile = path.join(tempDir, 'test.txt');
    fs.writeFileSync(testFile, 'Test content', 'utf-8');

    const provider = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'read_file',
              arguments: JSON.stringify({ path: 'test.txt' }),
            },
          },
        ],
      },
      {
        content: 'The file contains: Test content',
        tool_calls: undefined,
      },
    ]);

    const agent = new AgentExecutor(provider, {
      workspaceRoot: tempDir,
    });

    const result = await agent.executeTurn('Read test.txt');

    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toBe(1);
    expect(result.messages).toHaveLength(4); // user, assistant with tool_call, tool result, final assistant
    expect(result.messages[2].role).toBe('tool');
    expect(result.messages[2].content).toContain('Test content');
  });

  it('should execute file write tool call', async () => {
    const provider = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'write_file',
              arguments: JSON.stringify({
                path: 'output.txt',
                content: 'Generated content',
              }),
            },
          },
        ],
      },
      {
        content: 'File written successfully',
        tool_calls: undefined,
      },
    ]);

    const agent = new AgentExecutor(provider, {
      workspaceRoot: tempDir,
    });

    const result = await agent.executeTurn('Write output.txt');

    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toBe(1);

    // Verify file was actually written
    const writtenContent = fs.readFileSync(
      path.join(tempDir, 'output.txt'),
      'utf-8'
    );
    expect(writtenContent).toBe('Generated content');
  });

  it('should execute shell command', async () => {
    const provider = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'execute_shell',
              arguments: JSON.stringify({ command: 'echo "Hello from shell"' }),
            },
          },
        ],
      },
      {
        content: 'Command executed successfully',
        tool_calls: undefined,
      },
    ]);

    const agent = new AgentExecutor(provider, {
      workspaceRoot: tempDir,
    });

    const result = await agent.executeTurn('Run echo command');

    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toBe(1);
    expect(result.messages[2].content).toContain('Hello from shell');
  });

  it('should execute multiple tool calls in sequence', async () => {
    const provider = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'write_file',
              arguments: JSON.stringify({
                path: 'file1.txt',
                content: 'Content 1',
              }),
            },
          },
        ],
      },
      {
        content: null,
        tool_calls: [
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'write_file',
              arguments: JSON.stringify({
                path: 'file2.txt',
                content: 'Content 2',
              }),
            },
          },
        ],
      },
      {
        content: 'Both files written',
        tool_calls: undefined,
      },
    ]);

    const agent = new AgentExecutor(provider, {
      workspaceRoot: tempDir,
    });

    const result = await agent.executeTurn('Write two files');

    expect(result.iterations).toBe(3);
    expect(result.toolCalls).toBe(2);
    expect(fs.existsSync(path.join(tempDir, 'file1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'file2.txt'))).toBe(true);
  });

  it('should execute multiple tool calls in parallel', async () => {
    const provider = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'write_file',
              arguments: JSON.stringify({
                path: 'parallel1.txt',
                content: 'Parallel 1',
              }),
            },
          },
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'write_file',
              arguments: JSON.stringify({
                path: 'parallel2.txt',
                content: 'Parallel 2',
              }),
            },
          },
        ],
      },
      {
        content: 'Both files written in parallel',
        tool_calls: undefined,
      },
    ]);

    const agent = new AgentExecutor(provider, {
      workspaceRoot: tempDir,
    });

    const result = await agent.executeTurn('Write two files in parallel');

    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toBe(2);
    expect(fs.existsSync(path.join(tempDir, 'parallel1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'parallel2.txt'))).toBe(true);
  });

  it('should handle tool execution errors gracefully', async () => {
    const provider = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'read_file',
              arguments: JSON.stringify({ path: 'nonexistent.txt' }),
            },
          },
        ],
      },
      {
        content: 'The file does not exist',
        tool_calls: undefined,
      },
    ]);

    const agent = new AgentExecutor(provider, {
      workspaceRoot: tempDir,
    });

    const result = await agent.executeTurn('Read nonexistent file');

    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toBe(1);
    expect(result.messages[2].content).toContain('not found');
  });

  it('should handle unknown tool name', async () => {
    const provider = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'unknown_tool',
              arguments: JSON.stringify({}),
            },
          },
        ],
      },
      {
        content: 'Tool not found',
        tool_calls: undefined,
      },
    ]);

    const agent = new AgentExecutor(provider, {
      workspaceRoot: tempDir,
    });

    const result = await agent.executeTurn('Use unknown tool');

    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toBe(1);
    expect(result.messages[2].content).toContain('Unknown tool');
  });

  it('should handle invalid tool arguments', async () => {
    const provider = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'read_file',
              arguments: 'invalid json',
            },
          },
        ],
      },
      {
        content: 'Invalid arguments',
        tool_calls: undefined,
      },
    ]);

    const agent = new AgentExecutor(provider, {
      workspaceRoot: tempDir,
    });

    const result = await agent.executeTurn('Read with invalid args');

    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toBe(1);
    expect(result.messages[2].content).toContain('Invalid tool arguments');
  });

  it('should respect maxIterations limit', async () => {
    // Provider that always returns tool calls (infinite loop)
    const provider = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'execute_shell',
              arguments: JSON.stringify({ command: 'echo loop' }),
            },
          },
        ],
      },
      {
        content: null,
        tool_calls: [
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'execute_shell',
              arguments: JSON.stringify({ command: 'echo loop' }),
            },
          },
        ],
      },
      {
        content: null,
        tool_calls: [
          {
            id: 'call_3',
            type: 'function',
            function: {
              name: 'execute_shell',
              arguments: JSON.stringify({ command: 'echo loop' }),
            },
          },
        ],
      },
      {
        content: null,
        tool_calls: [
          {
            id: 'call_4',
            type: 'function',
            function: {
              name: 'execute_shell',
              arguments: JSON.stringify({ command: 'echo loop' }),
            },
          },
        ],
      },
      {
        content: null,
        tool_calls: [
          {
            id: 'call_5',
            type: 'function',
            function: {
              name: 'execute_shell',
              arguments: JSON.stringify({ command: 'echo loop' }),
            },
          },
        ],
      },
    ]);

    const agent = new AgentExecutor(provider, {
      workspaceRoot: tempDir,
      maxIterations: 3,
    });

    const result = await agent.executeTurn('Loop forever');

    expect(result.iterations).toBe(3);
  });

  it('should use memory tool for persistence', async () => {
    const userId = `test-user-${Date.now()}`;

    const provider1 = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'memory',
              arguments: JSON.stringify({
                action: 'set',
                key: 'test_key',
                value: 'test_value',
              }),
            },
          },
        ],
      },
      {
        content: 'Stored in memory',
        tool_calls: undefined,
      },
    ]);

    const agent1 = new AgentExecutor(provider1, {
      workspaceRoot: tempDir,
      userId,
    });

    await agent1.executeTurn('Store test_key');

    // Create new agent with same userId to verify persistence
    const provider2 = new MockProvider([
      {
        content: null,
        tool_calls: [
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'memory',
              arguments: JSON.stringify({
                action: 'get',
                key: 'test_key',
              }),
            },
          },
        ],
      },
      {
        content: 'Retrieved from memory',
        tool_calls: undefined,
      },
    ]);

    const agent2 = new AgentExecutor(provider2, {
      workspaceRoot: tempDir,
      userId,
    });

    const result = await agent2.executeTurn('Get test_key');

    expect(result.messages[2].content).toBe('test_value');

    // Cleanup
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const memoryPath = path.join(homeDir, '.loom', 'users', userId, 'memory.json');
    try {
      if (fs.existsSync(memoryPath)) fs.unlinkSync(memoryPath);
      const userDir = path.dirname(memoryPath);
      if (fs.existsSync(userDir)) fs.rmdirSync(userDir);
    } catch {}
  });

  it('should provide all default tools', () => {
    const tools = AgentExecutor.getDefaultTools();
    expect(tools).toContain('read_file');
    expect(tools).toContain('write_file');
    expect(tools).toContain('execute_shell');
    expect(tools).toContain('memory');
  });
});
