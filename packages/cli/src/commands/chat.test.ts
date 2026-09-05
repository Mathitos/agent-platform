import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatCommand } from './chat';
import { I18n } from '@loom/core';

describe('ChatCommand - Comprehensive Behavior Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    I18n.setLocale('en');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Static class design', () => {
    it('should be a class with static methods', () => {
      expect(typeof ChatCommand).toBe('function');
      expect(typeof ChatCommand.execute).toBe('function');
    });
  });

  describe('Provider selection', () => {
    it('should prefer OpenAI when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.OPENAI_COMPATIBLE_BASE_URL = 'http://localhost:1234';
      process.env.OPENAI_COMPATIBLE_API_KEY = 'test';

      const provider = ChatCommand['createProvider']();
      expect(provider.getName()).toBe('OpenAI');
    });

    it('should use OpenAI-compatible when OPENAI_API_KEY is not set', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.OPENAI_COMPATIBLE_BASE_URL = 'http://localhost:1234';
      process.env.OPENAI_COMPATIBLE_API_KEY = 'test';

      const provider = ChatCommand['createProvider']();
      expect(provider.getName()).toBe('OpenAI-compatible');
    });

    it('should prioritize OPENAI_API_KEY over OpenAI-compatible even when both set', () => {
      process.env.OPENAI_API_KEY = 'sk-openai';
      process.env.OPENAI_COMPATIBLE_BASE_URL = 'http://localhost:1234';
      process.env.OPENAI_COMPATIBLE_API_KEY = 'compatible-key';

      const provider = ChatCommand['createProvider']();
      expect(provider.getName()).toBe('OpenAI');
    });

    it('should require both base URL and API key for OpenAI-compatible', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.OPENAI_COMPATIBLE_BASE_URL = 'http://localhost:1234';
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow(/No provider configured/);
    });

    it('should require API key even if base URL is set', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      process.env.OPENAI_COMPATIBLE_API_KEY = 'test';

      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow(/No provider configured/);
    });

    it('should support OPENAI_COMPATIBLE_MODEL env var', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.OPENAI_COMPATIBLE_BASE_URL = 'http://localhost:1234';
      process.env.OPENAI_COMPATIBLE_API_KEY = 'test';
      process.env.OPENAI_COMPATIBLE_MODEL = 'custom-model';

      const provider = ChatCommand['createProvider']();
      expect(provider.getName()).toBe('OpenAI-compatible');
    });
  });

  describe('Missing API key errors', () => {
    it('should throw when no provider is configured', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow(/No provider configured/);
    });

    it('should provide clear error when no provider configured', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow(/OPENAI_API_KEY/);
    });

    it('should suggest configuration options in error', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow(/configure a provider/);
    });
  });

  describe('Locale-aware errors', () => {
    it('should show English error message by default', () => {
      I18n.setLocale('en');
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow('No provider configured. Set OPENAI_API_KEY or configure a provider.');
    });

    it('should show Portuguese error message when locale is pt-BR', () => {
      I18n.setLocale('pt-BR');
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow('Nenhum provedor configurado. Defina OPENAI_API_KEY ou configure um provedor.');
    });

    it('should switch error language with locale changes', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      I18n.setLocale('en');
      let errorEN: any;
      try {
        ChatCommand['createProvider']();
      } catch (e) {
        errorEN = e;
      }
      expect(errorEN.message).toContain('No provider configured');

      I18n.setLocale('pt-BR');
      let errorPT: any;
      try {
        ChatCommand['createProvider']();
      } catch (e) {
        errorPT = e;
      }
      expect(errorPT.message).toContain('Nenhum provedor configurado');

      expect(errorEN.message).not.toBe(errorPT.message);
    });
  });

  describe('Single-turn path', () => {
    let fetchSpy: any;

    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch');
      process.env.OPENAI_API_KEY = 'sk-test';
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('should execute single-turn chat request', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Single turn response' } }],
          model: 'gpt-3.5-turbo',
        }),
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await ChatCommand['singleTurn'](
        ChatCommand['createProvider'](),
        'test message'
      );

      expect(fetchSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Single turn response')
      );

      consoleLogSpy.mockRestore();
    });

    it('should show provider name in single-turn output', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await ChatCommand['singleTurn'](
        ChatCommand['createProvider'](),
        'test'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('OpenAI')
      );

      consoleLogSpy.mockRestore();
    });

    it('should show token usage when available', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await ChatCommand['singleTurn'](
        ChatCommand['createProvider'](),
        'test'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tokens: 30')
      );

      consoleLogSpy.mockRestore();
    });

    it('should exit with error on chat failure', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      await ChatCommand['singleTurn'](
        ChatCommand['createProvider'](),
        'test'
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should show locale-aware error message on failure', async () => {
      I18n.setLocale('pt-BR');
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      await ChatCommand['singleTurn'](
        ChatCommand['createProvider'](),
        'test'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Falha na solicitação de chat')
      );

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe('Environment-only secrets', () => {
    it('should not have hardcoded API keys', () => {
      const chatCommandSource = ChatCommand.toString();
      expect(chatCommandSource).not.toContain('sk-');
      expect(chatCommandSource).not.toMatch(/[a-f0-9]{32,}/);
    });

    it('should read credentials from environment variables only', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow();
    });
  });
});
