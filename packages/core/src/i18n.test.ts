import { describe, it, expect } from 'vitest';
import { I18n } from '../src/i18n';

describe('I18n', () => {
  it('should default to English', () => {
    expect(I18n.getLocale()).toBe('en');
  });

  it('should switch to Portuguese', () => {
    I18n.setLocale('pt-BR');
    expect(I18n.getLocale()).toBe('pt-BR');
    I18n.setLocale('en');
  });

  it('should translate English strings', () => {
    I18n.setLocale('en');
    expect(I18n.t('cli.description')).toBe('Loom — weave many agents and model providers into one CLI workflow');
  });

  it('should translate Portuguese strings', () => {
    I18n.setLocale('pt-BR');
    expect(I18n.t('cli.description')).toBe('Loom — teça múltiplos agentes e provedores de modelo em um fluxo de trabalho CLI');
    I18n.setLocale('en');
  });

  it('should return key for missing translation', () => {
    expect(I18n.t('nonexistent.key')).toBe('nonexistent.key');
  });
});
