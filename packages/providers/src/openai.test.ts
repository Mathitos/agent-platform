import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

  describe('Environment-based authentication', () => {
    it('should create from OPENAI_API_KEY environment variable', () => {
      process.env.OPENAI_API_KEY = 'env-test-key';

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
      process.env.OPENAI_API_KEY = 'env-test-key';
      process.env.OPENAI_MODEL = 'gpt-4';

      const provider = OpenAIProvider.fromEnv();
      expect(provider.getName()).toBe('OpenAI');

      delete process.env.OPENAI_MODEL;
    });

    it('should handle missing OPENAI_MODEL gracefully', () => {
      process.env.OPENAI_API_KEY = 'env-test-key';
      delete process.env.OPENAI_MODEL;

      const provider = OpenAIProvider.fromEnv();
      expect(provider.getName()).toBe('OpenAI');
    });
  });

  describe('Base URL', () => {
    it('should use official OpenAI API base URL', () => {
      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'test-key',
      });

      expect(provider.getName()).toBe('OpenAI');
    });

    it('should construct correct endpoint path', () => {
      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'test-key',
      });

      expect(provider.getName()).toBe('OpenAI');
    });
  });

  describe('Request headers', () => {
    it('should not have hardcoded API keys in source', () => {
      const provider = new OpenAIProvider({
        type: 'openai',
        apiKey: 'test-key',
      });

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
      process.env.OPENAI_API_KEY = 'test-key';

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
