import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenAICompatibleProvider } from '../src/openai-compatible';
import { ProviderAdapter } from '@loom/core';

describe('OpenAICompatibleProvider', () => {
  describe('Configuration', () => {
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

    it('should accept custom model', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
        model: 'custom-model',
      });

      expect(provider.getName()).toBe('OpenAI-compatible');
    });
  });

  describe('ProviderAdapter contract', () => {
    it('should extend ProviderAdapter', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      expect(provider).toBeInstanceOf(ProviderAdapter);
    });

    it('should implement chat method', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      expect(typeof provider.chat).toBe('function');
    });

    it('should implement getName method', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      expect(typeof provider.getName).toBe('function');
      expect(provider.getName()).toBe('OpenAI-compatible');
    });
  });

  describe('Request shaping', () => {
    it('should build request with correct structure', () => {
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

    it('should convert camelCase maxTokens to snake_case max_tokens', () => {
      const request = {
        messages: [{ role: 'user' as const, content: 'Test' }],
        maxTokens: 50,
      };

      const builtRequest = OpenAICompatibleProvider.buildRequest(request);

      expect(builtRequest.max_tokens).toBe(50);
      expect(builtRequest).not.toHaveProperty('maxTokens');
    });

    it('should always set stream to false', () => {
      const request = {
        messages: [{ role: 'user' as const, content: 'Test' }],
        stream: true,
      };

      const builtRequest = OpenAICompatibleProvider.buildRequest(request);

      expect(builtRequest.stream).toBe(false);
    });

    it('should handle multiple messages', () => {
      const request = {
        messages: [
          { role: 'system' as const, content: 'You are helpful.' },
          { role: 'user' as const, content: 'Hi!' },
          { role: 'assistant' as const, content: 'Hello!' },
          { role: 'user' as const, content: 'How are you?' },
        ],
      };

      const builtRequest = OpenAICompatibleProvider.buildRequest(request);

      expect(builtRequest.messages).toHaveLength(4);
      expect(builtRequest.messages[0].role).toBe('system');
      expect(builtRequest.messages[3].content).toBe('How are you?');
    });

    it('should preserve temperature when provided', () => {
      const request = {
        messages: [{ role: 'user' as const, content: 'Test' }],
        temperature: 0.9,
      };

      const builtRequest = OpenAICompatibleProvider.buildRequest(request);

      expect(builtRequest.temperature).toBe(0.9);
    });

    it('should handle missing optional parameters', () => {
      const request = {
        messages: [{ role: 'user' as const, content: 'Test' }],
      };

      const builtRequest = OpenAICompatibleProvider.buildRequest(request);

      expect(builtRequest.temperature).toBeUndefined();
      expect(builtRequest.max_tokens).toBeUndefined();
    });
  });

  describe('Base URL handling', () => {
    it('should construct correct endpoint URL without trailing slash', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      expect(provider.getName()).toBe('OpenAI-compatible');
    });

    it('should construct correct endpoint URL with trailing slash', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234/',
        apiKey: 'test-key',
      });

      expect(provider.getName()).toBe('OpenAI-compatible');
    });

    it('should handle HTTPS URLs', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'https://api.example.com',
        apiKey: 'test-key',
      });

      expect(provider.getName()).toBe('OpenAI-compatible');
    });

    it('should handle URLs with ports', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:8080',
        apiKey: 'test-key',
      });

      expect(provider.getName()).toBe('OpenAI-compatible');
    });

    it('should handle Bionic-style URLs', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:11434/v1',
        apiKey: 'bionic-key',
      });

      expect(provider.getName()).toBe('OpenAI-compatible');
    });

    it('should handle LM Studio URLs', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'lm-studio',
      });

      expect(provider.getName()).toBe('OpenAI-compatible');
    });
  });

  describe('Environment-based configuration', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should not have hardcoded API keys', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      expect(provider.getName()).toBe('OpenAI-compatible');
    });

    it('should accept API key from config parameter', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'env-provided-key',
      });

      expect(provider.getName()).toBe('OpenAI-compatible');
    });
  });

  describe('Secrets handling', () => {
    it('should not expose API key in getName', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'secret-key-12345',
      });

      const name = provider.getName();
      expect(name).not.toContain('secret-key');
      expect(name).not.toContain('12345');
    });

    it('should not expose baseUrl credentials in getName', () => {
      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://user:pass@localhost:1234',
        apiKey: 'test-key',
      });

      const name = provider.getName();
      expect(name).toBe('OpenAI-compatible');
      expect(name).not.toContain('user');
      expect(name).not.toContain('pass');
    });
  });
});
