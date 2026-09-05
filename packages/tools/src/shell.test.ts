import { describe, it, expect, beforeEach } from 'vitest';
import { ShellTool } from './shell';
import { ToolExecutionContext } from './types';
import * as path from 'path';
import * as os from 'os';

describe('ShellTool', () => {
  let tool: ShellTool;
  let context: ToolExecutionContext;

  beforeEach(() => {
    tool = new ShellTool();
    context = {
      workspaceRoot: process.cwd(),
      userId: 'test-user',
      trustedPaths: [],
    };
  });

  it('should have correct tool definition', () => {
    const def = tool.getDefinition();
    expect(def.name).toBe('execute_shell');
    expect(def.description).toContain('Execute');
    expect(def.parameters.properties.command).toBeDefined();
    expect(def.parameters.properties.timeout).toBeDefined();
    expect(def.parameters.required).toContain('command');
  });

  it('should execute simple command successfully', async () => {
    const result = await tool.execute({ command: 'echo "Hello"' }, context);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Hello');
    expect(result.exitCode).toBe(0);
  });

  it('should capture stdout', async () => {
    const result = await tool.execute(
      { command: 'echo "Test output"' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.stdout?.trim()).toBe('Test output');
  });

  it('should fail for missing command parameter', async () => {
    const result = await tool.execute({}, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing');
  });

  it('should handle non-zero exit code', async () => {
    const result = await tool.execute({ command: 'exit 1' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('failed');
    expect(result.exitCode).toBe(1);
  });

  it('should handle command not found', async () => {
    const result = await tool.execute(
      { command: 'nonexistentcommand12345' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should timeout long-running command', async () => {
    const shortTimeout = new ShellTool(100); // 100ms timeout

    const result = await shortTimeout.execute(
      { command: 'sleep 5' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  }, 10000);

  it('should respect custom timeout parameter', async () => {
    const result = await tool.execute(
      { command: 'sleep 2', timeout: 100 },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  }, 10000);

  it('should execute command in workspace directory', async () => {
    const result = await tool.execute({ command: 'pwd' }, context);

    expect(result.success).toBe(true);
    expect(result.stdout).toBeDefined();
  });

  it('should handle stderr output', async () => {
    // Command that writes to stderr but succeeds
    const result = await tool.execute(
      { command: 'echo "error message" >&2' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.stderr).toContain('error message');
  });

  it('should handle complex command with pipes', async () => {
    const result = await tool.execute(
      { command: 'echo "line1\nline2\nline3" | grep line2' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.stdout?.trim()).toBe('line2');
  });

  it('should handle multiline commands', async () => {
    const result = await tool.execute(
      {
        command: `echo "first"
echo "second"`,
      },
      context
    );

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('first');
    expect(result.stdout).toContain('second');
  });

  it('should handle empty command output', async () => {
    const result = await tool.execute({ command: 'true' }, context);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('should handle command with quotes', async () => {
    const result = await tool.execute(
      { command: 'echo "Hello World"' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.stdout?.trim()).toBe('Hello World');
  });

  it('should execute multiple commands with &&', async () => {
    const result = await tool.execute(
      { command: 'echo "first" && echo "second"' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('first');
    expect(result.stdout).toContain('second');
  });

  it('should fail if any command in && chain fails', async () => {
    const result = await tool.execute(
      { command: 'echo "first" && exit 1 && echo "second"' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.stdout).toContain('first');
    expect(result.stdout).not.toContain('second');
  });
});
