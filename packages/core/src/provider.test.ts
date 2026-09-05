import { describe, it, expect } from 'vitest';
import { ProviderAdapter } from '../src/provider';

describe('ProviderAdapter', () => {
  class TestProvider extends ProviderAdapter {
    async chat(request: any) {
      return {
        content: 'test response',
        model: 'test-model',
      };
    }

    getName() {
      return 'Test';
    }
  }

  describe('Abstract class contract', () => {
    it('should be an abstract class', () => {
      expect(typeof ProviderAdapter).toBe('function');
    });

    it('should require chat method implementation', () => {
      const provider = new TestProvider({ type: 'openai' });
      expect(typeof provider.chat).toBe('function');
    });

    it('should require getName method implementation', () => {
      const provider = new TestProvider({ type: 'openai' });
      expect(typeof provider.getName).toBe('function');
    });

    it('should accept config in constructor', () => {
      const config = { type: 'openai' as const, apiKey: 'test' };
      const provider = new TestProvider(config);
      expect(provider).toBeDefined();
    });

    it('should provide static validateConfig method', () => {
      expect(typeof ProviderAdapter.validateConfig).toBe('function');
    });
  });

  describe('Config validation', () => {
    it('should validate that config has type', () => {
      expect(() => {
        ProviderAdapter.validateConfig({} as any);
      }).toThrow('Provider type is required');
    });

    it('should accept valid config with type', () => {
      expect(() => {
        ProviderAdapter.validateConfig({ type: 'openai' });
      }).not.toThrow();
    });

    it('should accept all provider types', () => {
      const types = ['openai', 'openai-compatible', 'cursor'] as const;
      
      for (const type of types) {
        expect(() => {
          ProviderAdapter.validateConfig({ type });
        }).not.toThrow();
      }
    });
  });

  describe('Type definitions', () => {
    it('should define Message interface', () => {
      const provider = new TestProvider({ type: 'openai' });
      const result = provider.chat({
        messages: [
          { role: 'user', content: 'test' },
        ],
      });
      expect(result).toBeDefined();
    });

    it('should define ChatCompletionRequest interface', () => {
      const provider = new TestProvider({ type: 'openai' });
      const result = provider.chat({
        messages: [{ role: 'user', content: 'test' }],
        model: 'test-model',
        temperature: 0.7,
        maxTokens: 100,
      });
      expect(result).toBeDefined();
    });

    it('should define ChatCompletionResponse interface', async () => {
      const provider = new TestProvider({ type: 'openai' });
      const result = await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });
      
      expect(result).toHaveProperty('content');
      expect(typeof result.content).toBe('string');
    });

    it('should support optional usage in response', async () => {
      class UsageProvider extends ProviderAdapter {
        async chat(_request: any) {
          return {
            content: 'test',
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30,
            },
          };
        }
        getName() { return 'Usage'; }
      }

      const provider = new UsageProvider({ type: 'openai' });
      const result = await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(result.usage).toBeDefined();
      expect(result.usage?.promptTokens).toBe(10);
      expect(result.usage?.completionTokens).toBe(20);
      expect(result.usage?.totalTokens).toBe(30);
    });
  });

  describe('Message roles', () => {
    it('should support system role', async () => {
      const provider = new TestProvider({ type: 'openai' });
      await provider.chat({
        messages: [{ role: 'system', content: 'You are helpful' }],
      });
    });

    it('should support user role', async () => {
      const provider = new TestProvider({ type: 'openai' });
      await provider.chat({
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    it('should support assistant role', async () => {
      const provider = new TestProvider({ type: 'openai' });
      await provider.chat({
        messages: [{ role: 'assistant', content: 'Hi there' }],
      });
    });
  });

  describe('Provider types', () => {
    it('should support openai type', () => {
      const provider = new TestProvider({ type: 'openai' });
      expect(provider).toBeDefined();
    });

    it('should support openai-compatible type', () => {
      const provider = new TestProvider({ type: 'openai-compatible' });
      expect(provider).toBeDefined();
    });

    it('should support cursor type', () => {
      const provider = new TestProvider({ type: 'cursor' });
      expect(provider).toBeDefined();
    });
  });
});
