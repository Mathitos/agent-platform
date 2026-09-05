import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileReadTool } from './file-read';
import { FileWriteTool } from './file-write';
import { ToolExecutionContext } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileReadTool', () => {
  let tool: FileReadTool;
  let context: ToolExecutionContext;
  let tempDir: string;

  beforeEach(() => {
    tool = new FileReadTool();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-test-'));
    context = {
      workspaceRoot: tempDir,
      userId: 'test-user',
      trustedPaths: [],
    };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should have correct tool definition', () => {
    const def = tool.getDefinition();
    expect(def.name).toBe('read_file');
    expect(def.description).toContain('Read');
    expect(def.parameters.properties.path).toBeDefined();
    expect(def.parameters.required).toContain('path');
  });

  it('should read file successfully', async () => {
    const testFile = path.join(tempDir, 'test.txt');
    fs.writeFileSync(testFile, 'Hello, World!', 'utf-8');

    const result = await tool.execute({ path: 'test.txt' }, context);

    expect(result.success).toBe(true);
    expect(result.output).toBe('Hello, World!');
  });

  it('should read file with absolute path', async () => {
    const testFile = path.join(tempDir, 'test.txt');
    fs.writeFileSync(testFile, 'Absolute path test', 'utf-8');

    const result = await tool.execute({ path: testFile }, context);

    expect(result.success).toBe(true);
    expect(result.output).toBe('Absolute path test');
  });

  it('should fail for missing path parameter', async () => {
    const result = await tool.execute({}, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing');
  });

  it('should fail for non-existent file', async () => {
    const result = await tool.execute({ path: 'nonexistent.txt' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should fail for directory instead of file', async () => {
    const testDir = path.join(tempDir, 'subdir');
    fs.mkdirSync(testDir);

    const result = await tool.execute({ path: 'subdir' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not a file');
  });

  it('should fail for path outside workspace', async () => {
    const result = await tool.execute({ path: '/etc/passwd' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('outside trusted');
  });

  it('should fail for path traversal attempt', async () => {
    const result = await tool.execute({ path: '../../etc/passwd' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/traversal|outside trusted/i);
  });

  it('should read nested file', async () => {
    const nestedDir = path.join(tempDir, 'nested', 'dir');
    fs.mkdirSync(nestedDir, { recursive: true });
    const nestedFile = path.join(nestedDir, 'file.txt');
    fs.writeFileSync(nestedFile, 'Nested content', 'utf-8');

    const result = await tool.execute({ path: 'nested/dir/file.txt' }, context);

    expect(result.success).toBe(true);
    expect(result.output).toBe('Nested content');
  });
});

describe('FileWriteTool', () => {
  let tool: FileWriteTool;
  let context: ToolExecutionContext;
  let tempDir: string;

  beforeEach(() => {
    tool = new FileWriteTool();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-test-'));
    context = {
      workspaceRoot: tempDir,
      userId: 'test-user',
      trustedPaths: [],
    };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should have correct tool definition', () => {
    const def = tool.getDefinition();
    expect(def.name).toBe('write_file');
    expect(def.description).toContain('Write');
    expect(def.parameters.properties.path).toBeDefined();
    expect(def.parameters.properties.content).toBeDefined();
    expect(def.parameters.required).toContain('path');
    expect(def.parameters.required).toContain('content');
  });

  it('should write file successfully', async () => {
    const result = await tool.execute(
      { path: 'test.txt', content: 'Hello, World!' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain('Successfully wrote');

    const writtenContent = fs.readFileSync(path.join(tempDir, 'test.txt'), 'utf-8');
    expect(writtenContent).toBe('Hello, World!');
  });

  it('should create parent directories if needed', async () => {
    const result = await tool.execute(
      { path: 'nested/dir/file.txt', content: 'Nested write' },
      context
    );

    expect(result.success).toBe(true);

    const writtenContent = fs.readFileSync(
      path.join(tempDir, 'nested', 'dir', 'file.txt'),
      'utf-8'
    );
    expect(writtenContent).toBe('Nested write');
  });

  it('should overwrite existing file', async () => {
    const testFile = path.join(tempDir, 'test.txt');
    fs.writeFileSync(testFile, 'Original content', 'utf-8');

    const result = await tool.execute(
      { path: 'test.txt', content: 'New content' },
      context
    );

    expect(result.success).toBe(true);

    const writtenContent = fs.readFileSync(testFile, 'utf-8');
    expect(writtenContent).toBe('New content');
  });

  it('should fail for missing path parameter', async () => {
    const result = await tool.execute({ content: 'test' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing');
  });

  it('should fail for missing content parameter', async () => {
    const result = await tool.execute({ path: 'test.txt' }, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing');
  });

  it('should write empty string', async () => {
    const result = await tool.execute(
      { path: 'empty.txt', content: '' },
      context
    );

    expect(result.success).toBe(true);

    const writtenContent = fs.readFileSync(path.join(tempDir, 'empty.txt'), 'utf-8');
    expect(writtenContent).toBe('');
  });

  it('should fail for path outside workspace', async () => {
    const result = await tool.execute(
      { path: '/etc/passwd', content: 'hack' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('outside trusted');
  });

  it('should fail for path traversal attempt', async () => {
    const result = await tool.execute(
      { path: '../../etc/passwd', content: 'hack' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/traversal|outside trusted/i);
  });

  it('should write with absolute path within workspace', async () => {
    const absolutePath = path.join(tempDir, 'absolute.txt');

    const result = await tool.execute(
      { path: absolutePath, content: 'Absolute write' },
      context
    );

    expect(result.success).toBe(true);

    const writtenContent = fs.readFileSync(absolutePath, 'utf-8');
    expect(writtenContent).toBe('Absolute write');
  });
});
