import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Git command runner interface for dependency injection and testing
 */
export interface GitRunner {
  exec(command: string, cwd: string): Promise<GitCommandResult>;
}

/**
 * Default Git runner that executes real git commands
 */
export class DefaultGitRunner implements GitRunner {
  async exec(command: string, cwd: string): Promise<GitCommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        stdout: (error.stdout || '').trim(),
        stderr: (error.stderr || '').trim(),
        exitCode: error.code || 1,
      };
    }
  }
}

/**
 * Static Git operations with injectable runner for testing
 */
export class GitOperations {
  private static runner: GitRunner = new DefaultGitRunner();

  /**
   * Set a custom runner (for testing)
   */
  static setRunner(runner: GitRunner): void {
    GitOperations.runner = runner;
  }

  /**
   * Reset to default runner
   */
  static resetRunner(): void {
    GitOperations.runner = new DefaultGitRunner();
  }

  /**
   * Get git status
   */
  static async status(cwd: string): Promise<GitCommandResult> {
    return GitOperations.runner.exec('git status --porcelain --branch', cwd);
  }

  /**
   * Get git diff
   */
  static async diff(cwd: string, staged: boolean = false, files?: string[]): Promise<GitCommandResult> {
    let command = 'git diff';
    
    if (staged) {
      command += ' --staged';
    }
    
    if (files && files.length > 0) {
      command += ' -- ' + files.map(f => `"${f}"`).join(' ');
    }

    return GitOperations.runner.exec(command, cwd);
  }

  /**
   * Commit changes
   */
  static async commit(cwd: string, message: string, files?: string[]): Promise<GitCommandResult> {
    // Add files first if specified
    if (files && files.length > 0) {
      const addCommand = 'git add ' + files.map(f => `"${f}"`).join(' ');
      const addResult = await GitOperations.runner.exec(addCommand, cwd);
      
      if (addResult.exitCode !== 0) {
        return addResult;
      }
    }

    // Commit with message
    const escapedMessage = message.replace(/"/g, '\\"');
    const commitCommand = `git commit -m "${escapedMessage}"`;
    
    return GitOperations.runner.exec(commitCommand, cwd);
  }

  /**
   * Get branch information
   */
  static async branchInfo(cwd: string): Promise<GitCommandResult> {
    return GitOperations.runner.exec('git branch -vv', cwd);
  }

  /**
   * Get current branch name
   */
  static async getCurrentBranch(cwd: string): Promise<GitCommandResult> {
    return GitOperations.runner.exec('git rev-parse --abbrev-ref HEAD', cwd);
  }

  /**
   * Check if directory is a git repository
   */
  static async isGitRepo(cwd: string): Promise<boolean> {
    const result = await GitOperations.runner.exec('git rev-parse --git-dir', cwd);
    return result.exitCode === 0;
  }
}
