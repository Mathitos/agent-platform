export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
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
