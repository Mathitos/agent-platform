export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ChatCompletionRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
}

export interface ChatCompletionResponse {
  content: string | null;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  tool_calls?: ToolCall[];
}

export interface ProviderConfig {
  type: 'openai' | 'openai-compatible' | 'cursor';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export abstract class ProviderAdapter {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  abstract getName(): string;

  static validateConfig(config: ProviderConfig): void {
    if (!config.type) {
      throw new Error('Provider type is required');
    }
  }
}
