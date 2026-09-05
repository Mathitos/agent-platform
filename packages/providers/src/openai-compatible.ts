import {
  ProviderAdapter,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderConfig,
} from '@loom/core';

export class OpenAICompatibleProvider extends ProviderAdapter {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    super(config);

    if (!config.baseUrl) {
      throw new Error('OpenAI-compatible provider requires baseUrl');
    }
    if (!config.apiKey) {
      throw new Error('OpenAI-compatible provider requires apiKey');
    }

    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}/v1/chat/completions`;
    const body = {
      model: request.model || this.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI-compatible API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as any;

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  getName(): string {
    return 'OpenAI-compatible';
  }

  static buildRequest(request: ChatCompletionRequest): any {
    return {
      model: request.model || 'gpt-3.5-turbo',
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false,
    };
  }
}
