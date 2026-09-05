import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenAIProvider } from '../src/openai';
import { ProviderAdapter } from '@loom/core';

describe('OpenAIProvider', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Configuration', () => {
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

    it('should accept custom model', () => {
      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      expect(provider.getName()).toBe('OpenAI');
    });

    it('should default to gpt-3.5-turbo model', () => {
      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'test-key',
      });

      expect(provider.getName()).toBe('OpenAI');
    });
  });

  describe('ProviderAdapter contract', () => {
    it('should extend ProviderAdapter', () => {
      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'test-key',
      });

      expect(provider).toBeInstanceOf(ProviderAdapter);
    });

    it('should implement chat method', () => {
      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'test-key',
      });

      expect(typeof provider.chat).toBe('function');
    });

    it('should implement getName method', () => {
      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'test-key',
      });

      expect(typeof provider.getName).toBe('function');
      expect(provider.getName()).toBe('OpenAI');
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

    it('should call official OpenAI API URL', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello' } }],
          model: 'gpt-3.5-turbo',
        }),
      });

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-test-key',
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
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

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-secret-12345',
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-secret-12345',
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

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-test',
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

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-test',
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

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4',
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'test message' }],
        temperature: 0.8,
        maxTokens: 150,
      });

      const callArgs = fetchSpy.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toEqual({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'test message' }],
        temperature: 0.8,
        max_tokens: 150,
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

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-test',
      });

      await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.stream).toBe(false);
    });

    it('should handle successful response with usage', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response from GPT' } }],
          model: 'gpt-4',
          usage: {
            prompt_tokens: 15,
            completion_tokens: 25,
            total_tokens: 40,
          },
        }),
      });

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-test',
      });

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(response.content).toBe('Response from GPT');
      expect(response.model).toBe('gpt-4');
      expect(response.usage?.promptTokens).toBe(15);
      expect(response.usage?.completionTokens).toBe(25);
      expect(response.usage?.totalTokens).toBe(40);
    });

    it('should handle 401 unauthorized error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      });

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-invalid',
      });

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/401.*Invalid API key/);
    });

    it('should handle 429 rate limit error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-test',
      });

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/429/);
    });

    it('should handle 500 server error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      });

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-test',
      });

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/500/);
    });

    it('should handle 503 service unavailable error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service temporarily unavailable',
      });

      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-test',
      });

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/503/);
    });
  });

  describe('Environment-based authentication', () => {
    it('should create from OPENAI_API_KEY environment variable', () => {
      process.env.OPENAI_API_KEY = 'sk-env-test-key';

      const provider = OpenAIProvider.fromEnv();
      expect(provider.getName()).toBe('OpenAI');
    });

    it('should throw when OPENAI_API_KEY is not set', () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        OpenAIProvider.fromEnv();
      }).toThrow('OPENAI_API_KEY environment variable not set');
    });

    it('should respect OPENAI_MODEL environment variable', () => {
      process.env.OPENAI_API_KEY = 'sk-env-test-key';
      process.env.OPENAI_MODEL = 'gpt-4';

      const provider = OpenAIProvider.fromEnv();
      expect(provider.getName()).toBe('OpenAI');

      delete process.env.OPENAI_MODEL;
    });

    it('should handle missing OPENAI_MODEL gracefully', () => {
      process.env.OPENAI_API_KEY = 'sk-env-test-key';
      delete process.env.OPENAI_MODEL;

      const provider = OpenAIProvider.fromEnv();
      expect(provider.getName()).toBe('OpenAI');
    });
  });

  describe('Secrets handling', () => {
    it('should not expose API key in getName', () => {
      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'sk-secret-key-12345',
      });

      const name = provider.getName();
      expect(name).toBe('OpenAI');
      expect(name).not.toContain('sk-');
      expect(name).not.toContain('secret');
      expect(name).not.toContain('12345');
    });

    it('should handle API key securely from environment', () => {
      process.env.OPENAI_API_KEY = 'sk-super-secret-key';

      const provider = OpenAIProvider.fromEnv();
      const name = provider.getName();

      expect(name).not.toContain('sk-');
      expect(name).not.toContain('super-secret');
    });
  });

  describe('Static factory methods', () => {
    it('should provide fromEnv static factory', () => {
      expect(typeof OpenAIProvider.fromEnv).toBe('function');
    });

    it('fromEnv should return OpenAIProvider instance', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const provider = OpenAIProvider.fromEnv();
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider).toBeInstanceOf(ProviderAdapter);
    });
  });

  describe('Error messages', () => {
    it('should provide clear error for missing API key', () => {
      expect(() => {
        new OpenAIProvider({
          type: 'openai',
        });
      }).toThrow(/OPENAI_API_KEY/);
    });

    it('should provide clear error for missing environment variable', () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        OpenAIProvider.fromEnv();
      }).toThrow(/OPENAI_API_KEY environment variable not set/);
    });
  });
});
