import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '../src/openai';

describe('OpenAIProvider', () => {
  it('should require apiKey', () => {
    expect(() => {
      new OpenAIProvider({
        type: 'openai',
      });
    }).toThrow('OpenAI provider requires apiKey');
  });

  it('should create provider with apiKey', () => {
    const provider = new OpenAIProvider({
      type: 'openai',
      apiKey: 'test-key',
    });

    expect(provider.getName()).toBe('OpenAI');
  });

  it('should use environment variable in fromEnv', () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'env-test-key';

    const provider = OpenAIProvider.fromEnv();
    expect(provider.getName()).toBe('OpenAI');

    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it('should throw when OPENAI_API_KEY is not set in fromEnv', () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    expect(() => {
      OpenAIProvider.fromEnv();
    }).toThrow('OPENAI_API_KEY environment variable not set');

    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });
});
