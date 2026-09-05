import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryTool } from './memory';
import { ToolExecutionContext } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('MemoryTool', () => {
  let tool: MemoryTool;
  let context: ToolExecutionContext;
  let testUserId: string;

  beforeEach(() => {
    tool = new MemoryTool();
    // Use unique user ID for each test to avoid conflicts
    testUserId = `test-user-${Date.now()}-${Math.random()}`;
    context = {
      workspaceRoot: process.cwd(),
      userId: testUserId,
      trustedPaths: [],
    };
  });

  afterEach(() => {
    // Clean up test memory file
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
      const memoryPath = path.join(homeDir, '.loom', 'users', testUserId, 'memory.json');
      if (fs.existsSync(memoryPath)) {
        fs.unlinkSync(memoryPath);
      }
      // Try to remove the user directory
      const userDir = path.dirname(memoryPath);
      if (fs.existsSync(userDir)) {
        fs.rmdirSync(userDir);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should have correct tool definition', () => {
    const def = tool.getDefinition();
    expect(def.name).toBe('memory');
    expect(def.description).toContain('persistent');
    expect(def.parameters.properties.action).toBeDefined();
    expect(def.parameters.properties.key).toBeDefined();
    expect(def.parameters.properties.value).toBeDefined();
    expect(def.parameters.required).toContain('action');
  });

  it('should set and get a value', async () => {
    const setResult = await tool.execute(
      { action: 'set', key: 'name', value: 'Alice' },
      context
    );
    expect(setResult.success).toBe(true);

    const getResult = await tool.execute(
      { action: 'get', key: 'name' },
      context
    );
    expect(getResult.success).toBe(true);
    expect(getResult.output).toBe('Alice');
  });

  it('should persist across tool instances', async () => {
    const tool1 = new MemoryTool();
    await tool1.execute(
      { action: 'set', key: 'persistent', value: 'data' },
      context
    );

    const tool2 = new MemoryTool();
    const result = await tool2.execute(
      { action: 'get', key: 'persistent' },
      context
    );
    expect(result.success).toBe(true);
    expect(result.output).toBe('data');
  });

  it('should fail to get non-existent key', async () => {
    const result = await tool.execute(
      { action: 'get', key: 'nonexistent' },
      context
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should delete a key', async () => {
    await tool.execute(
      { action: 'set', key: 'toDelete', value: 'temp' },
      context
    );

    const deleteResult = await tool.execute(
      { action: 'delete', key: 'toDelete' },
      context
    );
    expect(deleteResult.success).toBe(true);

    const getResult = await tool.execute(
      { action: 'get', key: 'toDelete' },
      context
    );
    expect(getResult.success).toBe(false);
  });

  it('should fail to delete non-existent key', async () => {
    const result = await tool.execute(
      { action: 'delete', key: 'nonexistent' },
      context
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should list all keys', async () => {
    await tool.execute({ action: 'set', key: 'key1', value: 'value1' }, context);
    await tool.execute({ action: 'set', key: 'key2', value: 'value2' }, context);

    const result = await tool.execute({ action: 'list' }, context);
    expect(result.success).toBe(true);
    expect(result.output).toContain('key1');
    expect(result.output).toContain('key2');
    expect(result.output).toContain('value1');
    expect(result.output).toContain('value2');
  });

  it('should show empty message when listing empty memory', async () => {
    const result = await tool.execute({ action: 'list' }, context);
    expect(result.success).toBe(true);
    expect(result.output).toContain('empty');
  });

  it('should fail for missing action', async () => {
    const result = await tool.execute({}, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing');
  });

  it('should fail for invalid action', async () => {
    const result = await tool.execute({ action: 'invalid' }, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown action');
  });

  it('should fail get without key', async () => {
    const result = await tool.execute({ action: 'get' }, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('key');
  });

  it('should fail set without key', async () => {
    const result = await tool.execute(
      { action: 'set', value: 'test' },
      context
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('key');
  });

  it('should fail set without value', async () => {
    const result = await tool.execute({ action: 'set', key: 'test' }, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('value');
  });

  it('should update existing key', async () => {
    await tool.execute(
      { action: 'set', key: 'update', value: 'original' },
      context
    );

    await tool.execute(
      { action: 'set', key: 'update', value: 'modified' },
      context
    );

    const result = await tool.execute({ action: 'get', key: 'update' }, context);
    expect(result.success).toBe(true);
    expect(result.output).toBe('modified');
  });

  it('should namespace memory by userId', async () => {
    const context1 = { ...context, userId: 'user1' };
    const context2 = { ...context, userId: 'user2' };

    await tool.execute({ action: 'set', key: 'data', value: 'user1-data' }, context1);
    await tool.execute({ action: 'set', key: 'data', value: 'user2-data' }, context2);

    const result1 = await tool.execute({ action: 'get', key: 'data' }, context1);
    expect(result1.output).toBe('user1-data');

    const result2 = await tool.execute({ action: 'get', key: 'data' }, context2);
    expect(result2.output).toBe('user2-data');

    // Cleanup
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    ['user1', 'user2'].forEach(userId => {
      try {
        const memoryPath = path.join(homeDir, '.loom', 'users', userId, 'memory.json');
        if (fs.existsSync(memoryPath)) fs.unlinkSync(memoryPath);
        const userDir = path.dirname(memoryPath);
        if (fs.existsSync(userDir)) fs.rmdirSync(userDir);
      } catch {}
    });
  });

  it('should handle special characters in values', async () => {
    const specialValue = 'Line 1\nLine 2\t"quotes"';
    await tool.execute(
      { action: 'set', key: 'special', value: specialValue },
      context
    );

    const result = await tool.execute({ action: 'get', key: 'special' }, context);
    expect(result.success).toBe(true);
    expect(result.output).toBe(specialValue);
  });
});
