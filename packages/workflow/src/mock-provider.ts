import { ProviderAdapter, ChatCompletionRequest, ChatCompletionResponse } from '@loom/core';

export class MockProvider extends ProviderAdapter {
  private mockResponse: ChatCompletionResponse;

  constructor(mockResponse?: Partial<ChatCompletionResponse>) {
    super({
      type: 'openai-compatible',
      baseUrl: 'http://localhost:mock',
      apiKey: 'mock-key',
    });

    this.mockResponse = {
      content: mockResponse?.content || 'Mock response',
      tool_calls: mockResponse?.tool_calls || [],
      usage: mockResponse?.usage,
    };
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return this.mockResponse;
  }

  getName(): string {
    return 'mock-provider';
  }
}
