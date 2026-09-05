import * as fs from 'fs';
import { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';
import { PathPermissionChecker } from './permissions';

export class FileReadTool extends Tool {
  getDefinition(): ToolDefinition {
    return {
      name: 'read_file',
      description: 'Read the contents of a file from the filesystem',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read (relative to workspace root or absolute)',
            required: true,
          },
        },
        required: ['path'],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const { path: filePath } = args;

      if (!filePath || typeof filePath !== 'string') {
        return {
          success: false,
          error: 'Missing or invalid "path" parameter',
        };
      }

      // Validate path permissions
      const validatedPath = PathPermissionChecker.validatePath(
        filePath,
        context.workspaceRoot,
        context.trustedPaths
      );

      // Check if file exists
      if (!PathPermissionChecker.pathExists(validatedPath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
        };
      }

      // Check if it's a file (not a directory)
      const stats = fs.statSync(validatedPath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: `Path is not a file: ${filePath}`,
        };
      }

      // Read file contents
      const content = fs.readFileSync(validatedPath, 'utf-8');

      return {
        success: true,
        output: content,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
