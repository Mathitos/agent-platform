export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolExecutionContext {
  workspaceRoot: string;
  userId: string;
  trustedPaths: string[];
}

export interface ToolExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
}

export abstract class Tool {
  abstract getDefinition(): ToolDefinition;
  abstract execute(args: Record<string, any>, context: ToolExecutionContext): Promise<ToolExecutionResult>;
  
  getName(): string {
    return this.getDefinition().name;
  }
}
