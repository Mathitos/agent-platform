import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleGitStatus, handleGitDiff, handleGitCommit, handleGitBranchInfo } from './git';
import { GitOperations, GitRunner } from '@loom/tools';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Git CLI Commands with Mock Runner', () => {
  let mockRunner: GitRunner;
  let consoleSpy: any;
  let exitSpy: any;

  beforeEach(() => {
    mockRunner = {
      exec: vi.fn(),
    };

    GitOperations.setRunner(mockRunner);

    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: any) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    GitOperations.resetRunner();
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    exitSpy.mockRestore();
  });

  describe('handleGitStatus', () => {
    it('should display git status', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '## main...origin/main\n M file.txt',
          stderr: '',
          exitCode: 0,
        });

      await handleGitStatus({ cwd: '/test' });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('main...origin/main'));
    });

    it('should handle non-git repository', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'not a git repository',
        exitCode: 128,
      });

      await expect(handleGitStatus({ cwd: '/test' })).rejects.toThrow('process.exit(1)');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error: Not a git repository');
    });

    it('should handle git command errors', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'fatal: some error',
          exitCode: 1,
        });

      await expect(handleGitStatus({ cwd: '/test' })).rejects.toThrow('process.exit(1)');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error:', 'fatal: some error');
    });
  });

  describe('handleGitDiff', () => {
    it('should display git diff', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: 'diff --git a/file.txt\n-old\n+new',
          stderr: '',
          exitCode: 0,
        });

      await handleGitDiff(false, [], { cwd: '/test' });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('diff --git'));
    });

    it('should display staged diff', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: 'staged changes',
          stderr: '',
          exitCode: 0,
        });

      await handleGitDiff(true, [], { cwd: '/test' });

      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--staged'),
        '/test'
      );
    });

    it('should diff specific files', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: 'file diff',
          stderr: '',
          exitCode: 0,
        });

      await handleGitDiff(false, ['file1.txt', 'file2.txt'], { cwd: '/test' });

      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('file1.txt'),
        '/test'
      );
    });

    it('should handle non-git repository', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'not a git repository',
        exitCode: 128,
      });

      await expect(handleGitDiff(false, [], { cwd: '/test' })).rejects.toThrow('process.exit(1)');
    });
  });

  describe('handleGitCommit', () => {
    it('should commit changes', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '[main abc1234] Test commit',
          stderr: '',
          exitCode: 0,
        });

      await handleGitCommit('Test commit', [], { cwd: '/test' });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Test commit'));
    });

    it('should commit specific files', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // git add
        .mockResolvedValueOnce({
          stdout: '[main abc1234] Commit files',
          stderr: '',
          exitCode: 0,
        });

      await handleGitCommit('Commit files', ['file1.txt'], { cwd: '/test' });

      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('git add'),
        '/test'
      );
    });

    it('should require commit message', async () => {
      await expect(handleGitCommit('', [], { cwd: '/test' })).rejects.toThrow('process.exit(1)');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error: Commit message is required');
    });

    it('should handle non-git repository', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'not a git repository',
        exitCode: 128,
      });

      await expect(handleGitCommit('Test', [], { cwd: '/test' })).rejects.toThrow('process.exit(1)');
    });
  });

  describe('handleGitBranchInfo', () => {
    it('should display branch information', async () => {
      (mockRunner.exec as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // isGitRepo
        .mockResolvedValueOnce({
          stdout: '* main abc1234 Latest commit',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: 'main',
          stderr: '',
          exitCode: 0,
        });

      await handleGitBranchInfo({ cwd: '/test' });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Current branch: main'));
      expect(consoleSpy.log).toHaveBeenCalledWith('All branches:');
    });

    it('should handle non-git repository', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'not a git repository',
        exitCode: 128,
      });

      await expect(handleGitBranchInfo({ cwd: '/test' })).rejects.toThrow('process.exit(1)');
    });
  });
});

// Integration tests with real temp git repos
describe('Git CLI Commands Integration (Real Git)', () => {
  let tempDir: string;
  let consoleSpy: any;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join('/tmp', 'git-cli-test-'));

    // Initialize git repo
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });

    // Reset to default runner for integration tests
    GitOperations.resetRunner();

    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  it('should work end-to-end: status, diff, commit, branch-info', async () => {
    // Create a file
    fs.writeFileSync(path.join(tempDir, 'test.txt'), 'content\n');

    // Check status
    await handleGitStatus({ cwd: tempDir });
    expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('test.txt'));

    // Stage and commit
    execSync('git add test.txt', { cwd: tempDir });
    await handleGitCommit('Initial commit', [], { cwd: tempDir });
    expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Initial commit'));

    // Modify file
    fs.writeFileSync(path.join(tempDir, 'test.txt'), 'modified\n');

    // Check diff
    consoleSpy.log.mockClear();
    await handleGitDiff(false, [], { cwd: tempDir });
    expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('-content'));

    // Check branch info
    consoleSpy.log.mockClear();
    await handleGitBranchInfo({ cwd: tempDir });
    // Branch name could be 'main' or 'master' depending on git config
    const calls = consoleSpy.log.mock.calls.flat().join(' ');
    expect(calls).toMatch(/main|master/);
  });
});
