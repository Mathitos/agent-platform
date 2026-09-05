import * as fs from 'fs';
import * as path from 'path';
import { Tool, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';

export interface MemoryStore {
  [key: string]: string;
}

export class MemoryTool extends Tool {
  private static getMemoryPath(userId: string): string {
    // User-namespaced memory storage
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const loomDir = path.join(homeDir, '.loom', 'users', userId);
    return path.join(loomDir, 'memory.json');
  }

  private static ensureMemoryDir(userId: string): void {
    const memoryPath = this.getMemoryPath(userId);
    const dir = path.dirname(memoryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private static loadMemory(userId: string): MemoryStore {
    const memoryPath = this.getMemoryPath(userId);
    if (!fs.existsSync(memoryPath)) {
      return {};
    }
    try {
      const content = fs.readFileSync(memoryPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private static saveMemory(userId: string, memory: MemoryStore): void {
    this.ensureMemoryDir(userId);
    const memoryPath = this.getMemoryPath(userId);
    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'memory',
      description: 'Store and retrieve persistent key-value data across sessions',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Action to perform: "get", "set", "delete", "list"',
            enum: ['get', 'set', 'delete', 'list'],
            required: true,
          },
          key: {
            type: 'string',
            description: 'Key to get/set/delete (required for get, set, delete)',
          },
          value: {
            type: 'string',
            description: 'Value to set (required for set action)',
          },
        },
        required: ['action'],
      },
    };
  }

  async execute(
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const { action, key, value } = args;

      if (!action || typeof action !== 'string') {
        return {
          success: false,
          error: 'Missing or invalid "action" parameter',
        };
      }

      const memory = MemoryTool.loadMemory(context.userId);

      switch (action) {
        case 'get': {
          if (!key || typeof key !== 'string') {
            return {
              success: false,
              error: 'Missing or invalid "key" parameter for get action',
            };
          }

          const storedValue = memory[key];
          if (storedValue === undefined) {
            return {
              success: false,
              error: `Key "${key}" not found in memory`,
            };
          }

          return {
            success: true,
            output: storedValue,
          };
        }

        case 'set': {
          if (!key || typeof key !== 'string') {
            return {
              success: false,
              error: 'Missing or invalid "key" parameter for set action',
            };
          }

          if (value === undefined || value === null) {
            return {
              success: false,
              error: 'Missing "value" parameter for set action',
            };
          }

          memory[key] = String(value);
          MemoryTool.saveMemory(context.userId, memory);

          return {
            success: true,
            output: `Set "${key}" = "${value}"`,
          };
        }

        case 'delete': {
          if (!key || typeof key !== 'string') {
            return {
              success: false,
              error: 'Missing or invalid "key" parameter for delete action',
            };
          }

          if (memory[key] === undefined) {
            return {
              success: false,
              error: `Key "${key}" not found in memory`,
            };
          }

          delete memory[key];
          MemoryTool.saveMemory(context.userId, memory);

          return {
            success: true,
            output: `Deleted key "${key}"`,
          };
        }

        case 'list': {
          const keys = Object.keys(memory);
          if (keys.length === 0) {
            return {
              success: true,
              output: 'Memory is empty',
            };
          }

          const entries = keys.map(k => `${k}: ${memory[k]}`).join('\n');
          return {
            success: true,
            output: `Memory entries (${keys.length}):\n${entries}`,
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
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
