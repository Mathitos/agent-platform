import { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';
import { GitOperations } from './git-runner';

/**
 * Tool to get git status
 */
export class GitStatusTool extends Tool {
  getDefinition(): ToolDefinition {
    return {
      name: 'git_status',
      description: 'Get the current git status showing modified, staged, and untracked files',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const isRepo = await GitOperations.isGitRepo(context.workspaceRoot);
      
      if (!isRepo) {
        return {
          success: false,
          error: 'Not a git repository',
        };
      }

      const result = await GitOperations.status(context.workspaceRoot);

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || 'Failed to get git status',
        };
      }

      return {
        success: true,
        output: result.stdout || 'Working tree clean',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Tool to get git diff
 */
export class GitDiffTool extends Tool {
  getDefinition(): ToolDefinition {
    return {
      name: 'git_diff',
      description: 'Get git diff showing changes in working directory or staged changes',
      parameters: {
        type: 'object',
        properties: {
          staged: {
            type: 'boolean',
            description: 'Show staged changes instead of working directory changes',
          },
          files: {
            type: 'array',
            description: 'Specific files to diff (optional)',
          },
        },
        required: [],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const isRepo = await GitOperations.isGitRepo(context.workspaceRoot);
      
      if (!isRepo) {
        return {
          success: false,
          error: 'Not a git repository',
        };
      }

      const { staged = false, files } = args;

      const result = await GitOperations.diff(
        context.workspaceRoot,
        staged,
        files
      );

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || 'Failed to get git diff',
        };
      }

      return {
        success: true,
        output: result.stdout || 'No changes',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Tool to commit changes
 */
export class GitCommitTool extends Tool {
  getDefinition(): ToolDefinition {
    return {
      name: 'git_commit',
      description: 'Commit changes to git repository (does not force push)',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Commit message',
            required: true,
          },
          files: {
            type: 'array',
            description: 'Specific files to commit (will be staged first)',
          },
        },
        required: ['message'],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const { message, files } = args;

      if (!message || typeof message !== 'string') {
        return {
          success: false,
          error: 'Missing or invalid "message" parameter',
        };
      }

      const isRepo = await GitOperations.isGitRepo(context.workspaceRoot);
      
      if (!isRepo) {
        return {
          success: false,
          error: 'Not a git repository',
        };
      }

      const result = await GitOperations.commit(
        context.workspaceRoot,
        message,
        files
      );

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || result.stdout || 'Failed to commit',
        };
      }

      return {
        success: true,
        output: result.stdout || 'Changes committed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Tool to get branch information
 */
export class GitBranchInfoTool extends Tool {
  getDefinition(): ToolDefinition {
    return {
      name: 'git_branch_info',
      description: 'Get information about git branches including current branch and tracking info',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const isRepo = await GitOperations.isGitRepo(context.workspaceRoot);
      
      if (!isRepo) {
        return {
          success: false,
          error: 'Not a git repository',
        };
      }

      const [branchResult, currentResult] = await Promise.all([
        GitOperations.branchInfo(context.workspaceRoot),
        GitOperations.getCurrentBranch(context.workspaceRoot),
      ]);

      if (branchResult.exitCode !== 0) {
        return {
          success: false,
          error: branchResult.stderr || 'Failed to get branch info',
        };
      }

      let output = `Current branch: ${currentResult.stdout || 'unknown'}\n\n`;
      output += 'All branches:\n';
      output += branchResult.stdout;

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
