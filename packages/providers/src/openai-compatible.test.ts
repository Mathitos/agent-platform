import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  describe('HTTP behavior', () => {
    let fetchSpy: any;

    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('should call correct URL endpoint', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello' } }],
          model: 'test-model',
        }),
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should send Authorization header with Bearer token', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello' } }],
        }),
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'secret-key-123',
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer secret-key-123',
          }),
        })
      );
    });

    it('should send Content-Type application/json header', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello' } }],
        }),
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should send POST request', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello' } }],
        }),
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should send correct request body structure', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello' } }],
        }),
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
        model: 'test-model',
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'test message' }],
        temperature: 0.7,
        maxTokens: 100,
      });

      const callArgs = fetchSpy.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toEqual({
        model: 'test-model',
        messages: [{ role: 'user', content: 'test message' }],
        temperature: 0.7,
        max_tokens: 100,
        stream: false,
      });
    });

    it('should default stream to false', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello' } }],
        }),
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.stream).toBe(false);
    });

    it('should handle successful response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test response' } }],
          model: 'gpt-3.5-turbo',
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(response.content).toBe('Test response');
      expect(response.model).toBe('gpt-3.5-turbo');
      expect(response.usage?.promptTokens).toBe(10);
      expect(response.usage?.completionTokens).toBe(20);
      expect(response.usage?.totalTokens).toBe(30);
    });

    it('should handle 401 unauthorized error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized: Invalid API key',
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'invalid-key',
      });

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/401.*Unauthorized/);
    });

    it('should handle 500 server error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/500/);
    });

    it('should handle 429 rate limit error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/429/);
    });

    it('should handle response without usage', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          model: 'test-model',
        }),
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(response.content).toBe('Response');
      expect(response.usage).toBeUndefined();
    });

    it('should handle empty response content', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '' } }],
        }),
      });

      const provider = new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
      });

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(response.content).toBe('');
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
  });

  describe('Base URL handling', () => {
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
  });
});
