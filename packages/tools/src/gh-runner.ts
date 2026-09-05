import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GhCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * GitHub CLI command runner interface for dependency injection and testing
 */
export interface GhRunner {
  exec(command: string, cwd: string): Promise<GhCommandResult>;
  isAvailable(cwd: string): Promise<boolean>;
}

/**
 * Default GitHub CLI runner that executes real gh commands
 */
export class DefaultGhRunner implements GhRunner {
  async exec(command: string, cwd: string): Promise<GhCommandResult> {
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

  async isAvailable(cwd: string): Promise<boolean> {
    const result = await this.exec('gh --version', cwd);
    return result.exitCode === 0;
  }
}

/**
 * Static GitHub operations with injectable runner for testing
 */
export class GhOperations {
  private static runner: GhRunner = new DefaultGhRunner();

  /**
   * Set a custom runner (for testing)
   */
  static setRunner(runner: GhRunner): void {
    GhOperations.runner = runner;
  }

  /**
   * Reset to default runner
   */
  static resetRunner(): void {
    GhOperations.runner = new DefaultGhRunner();
  }

  /**
   * Check if gh CLI is available
   */
  static async isAvailable(cwd: string): Promise<boolean> {
    return GhOperations.runner.isAvailable(cwd);
  }

  /**
   * Create a pull request
   */
  static async createPR(
    cwd: string,
    title: string,
    body: string,
    base?: string,
    draft: boolean = false
  ): Promise<GhCommandResult> {
    let command = `gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"`;

    if (base) {
      command += ` --base "${base}"`;
    }

    if (draft) {
      command += ' --draft';
    }

    return GhOperations.runner.exec(command, cwd);
  }

  /**
   * View a pull request
   */
  static async viewPR(
    cwd: string,
    prNumber?: string,
    web: boolean = false
  ): Promise<GhCommandResult> {
    let command = 'gh pr view';

    if (prNumber) {
      command += ` ${prNumber}`;
    }

    if (web) {
      command += ' --web';
    } else {
      command += ' --json number,title,body,state,url,author,mergeable,commits';
    }

    return GhOperations.runner.exec(command, cwd);
  }

  /**
   * List pull requests
   */
  static async listPRs(
    cwd: string,
    state: 'open' | 'closed' | 'merged' | 'all' = 'open',
    limit: number = 10
  ): Promise<GhCommandResult> {
    const command = `gh pr list --state ${state} --limit ${limit} --json number,title,url,state,author`;

    return GhOperations.runner.exec(command, cwd);
  }
}
