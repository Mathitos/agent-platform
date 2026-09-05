import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CursorProvider } from '../src/cursor';
import { ProviderAdapter } from '@loom/core';
import { I18n } from '@loom/core';

describe('CursorProvider', () => {
  describe('BLOCKED status per M0', () => {
    beforeEach(() => {
      I18n.setLocale('en');
    });

    it('should throw BLOCKED error on chat attempt', async () => {
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow();
    });

    it('should throw error containing "BLOCKED"', async () => {
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/BLOCKED/);
    });

    it('should throw error containing "M0"', async () => {
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/M0/);
    });

    it('should mention lack of official API', async () => {
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/no documented official API/i);
    });

    it('should suggest OPENAI_API_KEY fallback', async () => {
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/OPENAI_API_KEY/);
    });

    it('should suggest OpenAI-compatible provider fallback', async () => {
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/OpenAI-compatible/);
    });

    it('should mention Bionic as fallback option', async () => {
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/Bionic/);
    });

    it('should mention LM Studio as fallback option', async () => {
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/LM Studio/);
    });
  });

  describe('Bilingual error messages', () => {
    afterEach(() => {
      I18n.setLocale('en');
    });

    it('should throw English BLOCKED error by default', async () => {
      I18n.setLocale('en');
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow('Cursor provider is BLOCKED per M0');
    });

    it('should throw Portuguese BLOCKED error when locale is pt-BR', async () => {
      I18n.setLocale('pt-BR');
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow('Provedor Cursor está BLOQUEADO conforme M0');
    });

    it('should include Portuguese fallback suggestions', async () => {
      I18n.setLocale('pt-BR');
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow(/OPENAI_API_KEY/);
    });

    it('should switch error message language with locale', async () => {
      const provider = CursorProvider.createStub();

      I18n.setLocale('en');
      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow('Cursor provider is BLOCKED');

      I18n.setLocale('pt-BR');
      await expect(provider.chat({
        messages: [{ role: 'user', content: 'test' }],
      })).rejects.toThrow('Provedor Cursor está BLOQUEADO');
    });
  });

  describe('ProviderAdapter contract', () => {
    it('should extend ProviderAdapter', () => {
      const provider = CursorProvider.createStub();
      expect(provider).toBeInstanceOf(ProviderAdapter);
    });

    it('should implement chat method', () => {
      const provider = CursorProvider.createStub();
      expect(typeof provider.chat).toBe('function');
    });

    it('should implement getName method', () => {
      const provider = CursorProvider.createStub();
      expect(typeof provider.getName).toBe('function');
      expect(provider.getName()).toBe('Cursor');
    });

    it('should return "Cursor" as provider name', () => {
      const provider = CursorProvider.createStub();
      expect(provider.getName()).toBe('Cursor');
    });
  });

  describe('Static factory method', () => {
    it('should provide createStub static factory', () => {
      expect(typeof CursorProvider.createStub).toBe('function');
    });

    it('createStub should return CursorProvider instance', () => {
      const provider = CursorProvider.createStub();
      expect(provider).toBeInstanceOf(CursorProvider);
      expect(provider).toBeInstanceOf(ProviderAdapter);
    });
  });

  describe('No accidental functionality', () => {
    it('should never successfully complete a chat request', async () => {
      const provider = CursorProvider.createStub();

      let errorThrown = false;
      try {
        await provider.chat({
          messages: [{ role: 'user', content: 'test' }],
        });
      } catch (error) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);
    });

    it('should fail for any message content', async () => {
      const provider = CursorProvider.createStub();

      const testMessages = [
        'hello',
        'test',
        'can you help me?',
        '',
        'a'.repeat(1000),
      ];

      for (const content of testMessages) {
        await expect(provider.chat({
          messages: [{ role: 'user', content }],
        })).rejects.toThrow(/BLOCKED/);
      }
    });

    it('should fail regardless of message count', async () => {
      const provider = CursorProvider.createStub();

      await expect(provider.chat({
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' },
          { role: 'user', content: 'How are you?' },
        ],
      })).rejects.toThrow(/BLOCKED/);
    });
  });
});
