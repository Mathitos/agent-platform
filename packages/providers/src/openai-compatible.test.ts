import { describe, it, expect } from 'vitest';
import { OpenAICompatibleProvider } from '../src/openai-compatible';

describe('OpenAICompatibleProvider', () => {
  it('should build request correctly', () => {
    const request = {
      messages: [
        { role: 'user' as const, content: 'Hello, world!' },
      ],
      model: 'test-model',
      temperature: 0.7,
      maxTokens: 100,
    };

    const builtRequest = OpenAICompatibleProvider.buildRequest(request);

    expect(builtRequest).toEqual({
      model: 'test-model',
      messages: [
        { role: 'user', content: 'Hello, world!' },
      ],
      temperature: 0.7,
      max_tokens: 100,
      stream: false,
    });
  });

  it('should use default model when not specified', () => {
    const request = {
      messages: [
        { role: 'user' as const, content: 'Hello!' },
      ],
    };

    const builtRequest = OpenAICompatibleProvider.buildRequest(request);

    expect(builtRequest.model).toBe('gpt-3.5-turbo');
  });

  it('should require baseUrl', () => {
    expect(() => {
      new OpenAICompatibleProvider({
        type: 'openai-compatible',
        apiKey: 'test-key',
      });
    }).toThrow('OpenAI-compatible provider requires baseUrl');
  });

  it('should require apiKey', () => {
    expect(() => {
      new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
      });
    }).toThrow('OpenAI-compatible provider requires apiKey');
  });

  it('should strip trailing slash from baseUrl', () => {
    const provider = new OpenAICompatibleProvider({
      type: 'openai-compatible',
      baseUrl: 'http://localhost:1234/',
      apiKey: 'test-key',
    });

    expect(provider.getName()).toBe('OpenAI-compatible');
  });
});
