import { exec } from 'child_process';
import { promisify } from 'util';
import { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';
import { I18n } from '@loom/core';

const execAsync = promisify(exec);

export interface ShellExecutionResult extends ToolExecutionResult {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export class ShellTool extends Tool {
  private defaultTimeout: number = 30000; // 30 seconds

  constructor(timeout?: number) {
    super();
    if (timeout !== undefined) {
      this.defaultTimeout = timeout;
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'execute_shell',
      description: 'Execute a shell command and capture output',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
            required: true,
          },
          timeout: {
            type: 'number',
            description: `Timeout in milliseconds (default: ${this.defaultTimeout})`,
          },
        },
        required: ['command'],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ShellExecutionResult> {
    try {
      const t = I18n.t.bind(I18n);
      const { command, timeout } = args;

      if (!command || typeof command !== 'string') {
        return {
          success: false,
          error: t('errors.missingCommandParam'),
        };
      }

      const timeoutMs = timeout ?? this.defaultTimeout;

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: context.workspaceRoot,
          timeout: timeoutMs,
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        });

        return {
          success: true,
          output: stdout,
          stdout,
          stderr: stderr || undefined,
          exitCode: 0,
        };
      } catch (execError: any) {
        // Check if it's a timeout
        if (execError.killed && execError.signal === 'SIGTERM') {
          return {
            success: false,
            error: t('errors.commandTimeout')(timeoutMs),
            stdout: execError.stdout || undefined,
            stderr: execError.stderr || undefined,
            exitCode: execError.code,
          };
        }

        // Non-zero exit code
        return {
          success: false,
          error: t('errors.commandFailed')(execError.code || 'unknown'),
          output: execError.stdout || undefined,
          stdout: execError.stdout || undefined,
          stderr: execError.stderr || undefined,
          exitCode: execError.code,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
