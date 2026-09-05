import {
  ProviderAdapter,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderConfig,
} from '@loom/core';

export class OpenAIProvider extends ProviderAdapter {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error('OpenAI provider requires apiKey (set OPENAI_API_KEY environment variable)');
    }

    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    this.baseUrl = 'https://api.openai.com';
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}/v1/chat/completions`;
    const body: any = {
      model: request.model || this.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false,
    };

    // Include tools if provided
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }

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
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as any;
    const message = data.choices[0]?.message;

    return {
      content: message?.content || null,
      model: data.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      tool_calls: message?.tool_calls,
    };
  }

  getName(): string {
    return 'OpenAI';
  }

  static fromEnv(): OpenAIProvider {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    return new OpenAIProvider({
      type: 'openai',
      apiKey,
      model: process.env.OPENAI_MODEL,
    });
  }
}
