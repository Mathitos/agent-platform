import { describe, it, expect } from 'vitest';
import { CursorProvider } from '../src/cursor';
import { I18n } from '@loom/core';

describe('CursorProvider', () => {
  it('should throw blocked error in English', async () => {
    I18n.setLocale('en');
    const provider = CursorProvider.createStub();

    await expect(provider.chat({
      messages: [{ role: 'user', content: 'test' }],
    })).rejects.toThrow('Cursor provider is BLOCKED per M0');
  });

  it('should throw blocked error in Portuguese', async () => {
    I18n.setLocale('pt-BR');
    const provider = CursorProvider.createStub();

    await expect(provider.chat({
      messages: [{ role: 'user', content: 'test' }],
    })).rejects.toThrow('Provedor Cursor está BLOQUEADO conforme M0');
  });

  it('should have correct name', () => {
    const provider = CursorProvider.createStub();
    expect(provider.getName()).toBe('Cursor');
  });
});
