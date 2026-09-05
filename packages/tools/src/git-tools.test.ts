import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitStatusTool, GitDiffTool, GitCommitTool, GitBranchInfoTool } from './git-tools';
import { GitOperations, GitRunner, GitCommandResult } from './git-runner';
import { ToolExecutionContext } from './types';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Git Tools with Mock Runner', () => {
  let mockRunner: GitRunner;
  let context: ToolExecutionContext;

  beforeEach(() => {
    context = {
      workspaceRoot: '/test/workspace',
      userId: 'test-user',
      trustedPaths: [],
    };

    mockRunner = {
      exec: vi.fn(),
    };

    GitOperations.setRunner(mockRunner);
  });

  afterEach(() => {
    GitOperations.resetRunner();
  });

  describe('GitStatusTool', () => {
    let tool: GitStatusTool;

    beforeEach(() => {
      tool = new GitStatusTool();
    });

    it('should have correct definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('git_status');
      expect(definition.description).toContain('git status');
    });

    it('should return git status', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '## main...origin/main\n M file.txt\n?? new-file.txt',
          stderr: '',
          exitCode: 0,
        });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('main...origin/main');
      expect(result.output).toContain('M file.txt');
    });

    it('should return error for non-git repository', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
      });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not a git repository');
    });

    it('should show clean working tree message', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '',
          stderr: '',
          exitCode: 0,
        });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Working tree clean');
    });

    it('should handle git command errors', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'fatal: some error',
          exitCode: 1,
        });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('some error');
    });
  });

  describe('GitDiffTool', () => {
    let tool: GitDiffTool;

    beforeEach(() => {
      tool = new GitDiffTool();
    });

    it('should have correct definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('git_diff');
      expect(definition.description).toContain('diff');
    });

    it('should return working directory diff', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: 'diff --git a/file.txt b/file.txt\n--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@\n-old\n+new',
          stderr: '',
          exitCode: 0,
        });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('diff --git');
      expect(result.output).toContain('-old');
      expect(result.output).toContain('+new');
    });

    it('should return staged diff', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: 'diff --git a/staged.txt b/staged.txt\n--- a/staged.txt\n+++ b/staged.txt\n@@ -1 +1 @@\n-old\n+staged',
          stderr: '',
          exitCode: 0,
        });

      const result = await tool.execute({ staged: true }, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('staged');
      expect((mockRunner.exec as any).mock.calls[1][0]).toContain('--staged');
    });

    it('should diff specific files', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: 'diff for file1.txt',
          stderr: '',
          exitCode: 0,
        });

      const result = await tool.execute({ files: ['file1.txt', 'file2.txt'] }, context);

      expect(result.success).toBe(true);
      expect((mockRunner.exec as any).mock.calls[1][0]).toContain('file1.txt');
      expect((mockRunner.exec as any).mock.calls[1][0]).toContain('file2.txt');
    });

    it('should show no changes message', async () => {
      (mockRunner.exec as any)
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

    it('should return error for non-git repository', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
      });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not a git repository');
    });
  });

  describe('GitCommitTool', () => {
    let tool: GitCommitTool;

    beforeEach(() => {
      tool = new GitCommitTool();
    });

    it('should have correct definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('git_commit');
      expect(definition.description).toContain('Commit changes');
      expect(definition.parameters.required).toContain('message');
    });

    it('should commit changes', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '[main abc1234] Test commit\n 1 file changed, 1 insertion(+)',
          stderr: '',
          exitCode: 0,
        });

      const result = await tool.execute({ message: 'Test commit' }, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Test commit');
      expect((mockRunner.exec as any).mock.calls[1][0]).toContain('git commit');
    });

    it('should stage and commit specific files', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // git add
        .mockResolvedValueOnce({
          stdout: '[main abc1234] Commit specific files',
          stderr: '',
          exitCode: 0,
        });

      const result = await tool.execute(
        { message: 'Commit specific files', files: ['file1.txt', 'file2.txt'] },
        context
      );

      expect(result.success).toBe(true);
      expect((mockRunner.exec as any).mock.calls[1][0]).toContain('git add');
      expect((mockRunner.exec as any).mock.calls[1][0]).toContain('file1.txt');
      expect((mockRunner.exec as any).mock.calls[2][0]).toContain('git commit');
    });

    it('should return error for missing message', async () => {
      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing or invalid "message" parameter');
    });

    it('should return error for non-git repository', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
      });

      const result = await tool.execute({ message: 'Test' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not a git repository');
    });

    it('should handle commit failures', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'nothing to commit',
          exitCode: 1,
        });

      const result = await tool.execute({ message: 'Test' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('nothing to commit');
    });

    it('should escape quotes in commit message', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '[main abc1234] Message with "quotes"',
          stderr: '',
          exitCode: 0,
        });

      const result = await tool.execute({ message: 'Message with "quotes"' }, context);

      expect(result.success).toBe(true);
      expect((mockRunner.exec as any).mock.calls[1][0]).toContain('\\"quotes\\"');
    });

    it('should handle git add failures', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'pathspec did not match any files',
          exitCode: 1,
        });

      const result = await tool.execute(
        { message: 'Test', files: ['nonexistent.txt'] },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('pathspec did not match');
    });
  });

  describe('GitBranchInfoTool', () => {
    let tool: GitBranchInfoTool;

    beforeEach(() => {
      tool = new GitBranchInfoTool();
    });

    it('should have correct definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('git_branch_info');
      expect(definition.description).toContain('branch');
    });

    it('should return branch information', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '* main abc1234 [origin/main] Latest commit\n  feature xyz5678 Feature work',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: 'main',
          stderr: '',
          exitCode: 0,
        });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Current branch: main');
      expect(result.output).toContain('All branches:');
      expect(result.output).toContain('feature xyz5678');
    });

    it('should return error for non-git repository', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
      });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not a git repository');
    });

    it('should handle branch info errors', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'fatal: some error',
          exitCode: 1,
        })
        .mockResolvedValueOnce({
          stdout: 'main',
          stderr: '',
          exitCode: 0,
        });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('some error');
    });
  });
});

// Integration tests with real temp git repos
describe('Git Tools Integration (Real Git)', () => {
  let tempDir: string;
  let context: ToolExecutionContext;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join('/tmp', 'git-test-'));
    
    context = {
      workspaceRoot: tempDir,
      userId: 'test-user',
      trustedPaths: [],
    };

    // Initialize git repo
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });

    // Reset to default runner for integration tests
    GitOperations.resetRunner();
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should work end-to-end: status, diff, commit, branch', async () => {
    const statusTool = new GitStatusTool();
    const diffTool = new GitDiffTool();
    const commitTool = new GitCommitTool();
    const branchTool = new GitBranchInfoTool();

    // Create a file
    fs.writeFileSync(path.join(tempDir, 'test.txt'), 'initial content\n');

    // Check status - should show untracked file
    let result = await statusTool.execute({}, context);
    expect(result.success).toBe(true);
    expect(result.output).toContain('test.txt');

    // Stage and commit
    execSync('git add test.txt', { cwd: tempDir });
    result = await commitTool.execute({ message: 'Initial commit' }, context);
    expect(result.success).toBe(true);

    // Modify file
    fs.writeFileSync(path.join(tempDir, 'test.txt'), 'modified content\n');

    // Check diff
    result = await diffTool.execute({}, context);
    expect(result.success).toBe(true);
    expect(result.output).toContain('-initial content');
    expect(result.output).toContain('+modified content');

    // Check branch info
    result = await branchTool.execute({}, context);
    expect(result.success).toBe(true);
    // Branch name could be 'main' or 'master' depending on git config
    expect(result.output).toMatch(/main|master/);
  });

  it('should handle commits with specific files', async () => {
    const commitTool = new GitCommitTool();

    // Create multiple files
    fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'content1\n');
    fs.writeFileSync(path.join(tempDir, 'file2.txt'), 'content2\n');

    // Commit only file1
    const result = await commitTool.execute(
      { message: 'Add file1', files: ['file1.txt'] },
      context
    );

    expect(result.success).toBe(true);

    // Check status - file2 should still be untracked
    const statusTool = new GitStatusTool();
    const statusResult = await statusTool.execute({}, context);
    expect(statusResult.output).toContain('file2.txt');
  });
});
