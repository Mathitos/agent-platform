import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatCommand } from './commands/chat';
import { CLI } from './cli';
import { I18n } from '@loom/core';
import { OpenAIProvider, OpenAICompatibleProvider } from '@loom/providers';

describe('Integration Tests - Config → Provider → Chat', () => {
  const originalEnv = { ...process.env };
  let fetchSpy: any;

  beforeEach(() => {
    process.env = { ...originalEnv };
    I18n.setLocale('en');
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    process.env = originalEnv;
    fetchSpy.mockRestore();
  });

  describe('Full flow: env → provider selection → API call', () => {
    it('should create OpenAI provider from OPENAI_API_KEY and call API', async () => {
      process.env.OPENAI_API_KEY = 'sk-integration-test';

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Integration test response' } }],
          model: 'gpt-3.5-turbo',
        }),
      });

      const provider = ChatCommand['createProvider']();
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.getName()).toBe('OpenAI');

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(response.content).toBe('Integration test response');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should create OpenAI-compatible provider from env and call API', async () => {
      delete process.env.OPENAI_API_KEY;
      process.env.OPENAI_COMPATIBLE_BASE_URL = 'http://localhost:1234';
      process.env.OPENAI_COMPATIBLE_API_KEY = 'local-key';

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Local response' } }],
        }),
      });

      const provider = ChatCommand['createProvider']();
      expect(provider).toBeInstanceOf(OpenAICompatibleProvider);
      expect(provider.getName()).toBe('OpenAI-compatible');

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(response.content).toBe('Local response');
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.any(Object)
      );
    });
  });

  describe('Full flow: missing config → error', () => {
    it('should throw localized error when no provider configured', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      I18n.setLocale('en');
      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow('No provider configured. Set OPENAI_API_KEY or configure a provider.');
    });

    it('should throw Portuguese error when no provider configured', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      I18n.setLocale('pt-BR');
      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow('Nenhum provedor configurado. Defina OPENAI_API_KEY ou configure um provedor.');
    });
  });

  describe('Full flow: API error → user-facing error', () => {
    it('should handle 401 authentication error', async () => {
      process.env.OPENAI_API_KEY = 'sk-invalid';

      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      const provider = ChatCommand['createProvider']();
      await ChatCommand['singleTurn'](provider, 'test');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Chat request failed')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('401')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should handle 429 rate limit error', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      const provider = ChatCommand['createProvider']();
      await ChatCommand['singleTurn'](provider, 'test');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Chat request failed')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should show locale-aware error on API failure', async () => {
      I18n.setLocale('pt-BR');
      process.env.OPENAI_API_KEY = 'sk-test';

      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      const provider = ChatCommand['createProvider']();
      await ChatCommand['singleTurn'](provider, 'test');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Falha na solicitação de chat')
      );

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe('Full flow: successful request → formatted output', () => {
    it('should display response content', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello from AI!' } }],
        }),
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const provider = ChatCommand['createProvider']();
      await ChatCommand['singleTurn'](provider, 'test');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hello from AI!')
      );

      consoleLogSpy.mockRestore();
    });

    it('should display token usage when available', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 10,
            total_tokens: 15,
          },
        }),
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const provider = ChatCommand['createProvider']();
      await ChatCommand['singleTurn'](provider, 'test');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Tokens.*15/)
      );

      consoleLogSpy.mockRestore();
    });

    it('should display provider name', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const provider = ChatCommand['createProvider']();
      await ChatCommand['singleTurn'](provider, 'test');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OpenAI]')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Provider preference flow', () => {
    it('should prefer OpenAI over OpenAI-compatible when both configured', () => {
      process.env.OPENAI_API_KEY = 'sk-openai';
      process.env.OPENAI_COMPATIBLE_BASE_URL = 'http://localhost:1234';
      process.env.OPENAI_COMPATIBLE_API_KEY = 'local';

      const provider = ChatCommand['createProvider']();
      expect(provider.getName()).toBe('OpenAI');
    });

    it('should fall back to OpenAI-compatible when OpenAI not configured', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.OPENAI_COMPATIBLE_BASE_URL = 'http://localhost:1234';
      process.env.OPENAI_COMPATIBLE_API_KEY = 'local';

      const provider = ChatCommand['createProvider']();
      expect(provider.getName()).toBe('OpenAI-compatible');
    });
  });

  describe('CLI to ChatCommand integration', () => {
    it('should route chat command to ChatCommand.execute', async () => {
      const executeSpy = vi.spyOn(ChatCommand, 'execute').mockResolvedValue();

      await CLI.runChat(['hello']);

      expect(executeSpy).toHaveBeenCalledWith(['hello']);

      executeSpy.mockRestore();
    });
  });
});
