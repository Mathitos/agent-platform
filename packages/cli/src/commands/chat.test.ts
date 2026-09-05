import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatCommand } from './chat';

describe('ChatCommand', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
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

  describe('Provider configuration from environment', () => {
    it('should throw when no provider is configured', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

      expect(() => {
        ChatCommand['createProvider']();
      }).toThrow(/No provider configured/);
    });

    it('should prefer OPENAI_API_KEY when available', () => {
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

    it('should require both base URL and API key for OpenAI-compatible', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.OPENAI_COMPATIBLE_BASE_URL = 'http://localhost:1234';
      delete process.env.OPENAI_COMPATIBLE_API_KEY;

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

  describe('Error messages', () => {
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
});
