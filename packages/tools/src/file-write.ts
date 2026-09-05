import * as fs from 'fs';
import { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';
import { PathPermissionChecker } from './permissions';
import { I18n } from '@loom/core';

export class FileWriteTool extends Tool {
  getDefinition(): ToolDefinition {
    return {
      name: 'write_file',
      description: 'Write content to a file on the filesystem',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write (relative to workspace root or absolute)',
            required: true,
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
            required: true,
          },
        },
        required: ['path', 'content'],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const t = I18n.t.bind(I18n);
      const { path: filePath, content } = args;

      if (!filePath || typeof filePath !== 'string') {
        return {
          success: false,
          error: t('errors.missingPathParam'),
        };
      }

      if (content === undefined || content === null) {
        return {
          success: false,
          error: t('errors.missingContentParam'),
        };
      }

      // Validate path permissions
      const validatedPath = PathPermissionChecker.validatePath(
        filePath,
        context.workspaceRoot,
        context.trustedPaths
      );

      // Ensure parent directory exists
      PathPermissionChecker.ensureParentDir(validatedPath);

      // Write file contents
      fs.writeFileSync(validatedPath, String(content), 'utf-8');

      return {
        success: true,
        output: t('errors.writeSuccess')(filePath),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
