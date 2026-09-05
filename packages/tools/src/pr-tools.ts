import { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';
import { GhOperations } from './gh-runner';

/**
 * Tool to create a pull request using GitHub CLI
 */
export class PRCreateTool extends Tool {
  getDefinition(): ToolDefinition {
    return {
      name: 'pr_create',
      description: 'Create a pull request using GitHub CLI (gh). Does not auto-merge.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Pull request title',
            required: true,
          },
          body: {
            type: 'string',
            description: 'Pull request description/body',
            required: true,
          },
          base: {
            type: 'string',
            description: 'Base branch to merge into (optional, defaults to repository default)',
          },
          draft: {
            type: 'boolean',
            description: 'Create as draft PR',
          },
        },
        required: ['title', 'body'],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const { title, body, base, draft = false } = args;

      if (!title || typeof title !== 'string') {
        return {
          success: false,
          error: 'Missing or invalid "title" parameter',
        };
      }

      if (!body || typeof body !== 'string') {
        return {
          success: false,
          error: 'Missing or invalid "body" parameter',
        };
      }

      // Check if gh is available
      const isAvailable = await GhOperations.isAvailable(context.workspaceRoot);
      if (!isAvailable) {
        return {
          success: false,
          error: 'GitHub CLI (gh) is not installed or not available in PATH. Please install gh: https://cli.github.com/',
        };
      }

      const result = await GhOperations.createPR(
        context.workspaceRoot,
        title,
        body,
        base,
        draft
      );

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || result.stdout || 'Failed to create pull request',
        };
      }

      return {
        success: true,
        output: result.stdout || 'Pull request created successfully',
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
 * Tool to view a pull request using GitHub CLI
 */
export class PRViewTool extends Tool {
  getDefinition(): ToolDefinition {
    return {
      name: 'pr_view',
      description: 'View details of a pull request using GitHub CLI (gh)',
      parameters: {
        type: 'object',
        properties: {
          number: {
            type: 'string',
            description: 'Pull request number (optional, defaults to current branch PR)',
          },
          web: {
            type: 'boolean',
            description: 'Open PR in web browser instead of showing details',
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
      const { number, web = false } = args;

      // Check if gh is available
      const isAvailable = await GhOperations.isAvailable(context.workspaceRoot);
      if (!isAvailable) {
        return {
          success: false,
          error: 'GitHub CLI (gh) is not installed or not available in PATH. Please install gh: https://cli.github.com/',
        };
      }

      const result = await GhOperations.viewPR(
        context.workspaceRoot,
        number,
        web
      );

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || result.stdout || 'Failed to view pull request',
        };
      }

      if (web) {
        return {
          success: true,
          output: 'Opened pull request in web browser',
        };
      }

      return {
        success: true,
        output: result.stdout,
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
 * Tool to list pull requests using GitHub CLI
 */
export class PRListTool extends Tool {
  getDefinition(): ToolDefinition {
    return {
      name: 'pr_list',
      description: 'List pull requests using GitHub CLI (gh)',
      parameters: {
        type: 'object',
        properties: {
          state: {
            type: 'string',
            description: 'Filter by state: open, closed, merged, or all',
            enum: ['open', 'closed', 'merged', 'all'],
          },
          limit: {
            type: 'number',
            description: 'Maximum number of PRs to list (default: 10)',
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
      const { state = 'open', limit = 10 } = args;

      // Check if gh is available
      const isAvailable = await GhOperations.isAvailable(context.workspaceRoot);
      if (!isAvailable) {
        return {
          success: false,
          error: 'GitHub CLI (gh) is not installed or not available in PATH. Please install gh: https://cli.github.com/',
        };
      }

      const result = await GhOperations.listPRs(
        context.workspaceRoot,
        state as any,
        limit
      );

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || result.stdout || 'Failed to list pull requests',
        };
      }

      return {
        success: true,
        output: result.stdout || 'No pull requests found',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
