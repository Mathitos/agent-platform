import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { I18n, strings } from '../src/i18n';

describe('I18n', () => {
  beforeEach(() => {
    I18n.setLocale('en');
  });

  afterEach(() => {
    I18n.setLocale('en');
  });

  describe('Static class design', () => {
    it('should be a class with static methods', () => {
      expect(typeof I18n).toBe('function');
      expect(typeof I18n.setLocale).toBe('function');
      expect(typeof I18n.getLocale).toBe('function');
      expect(typeof I18n.t).toBe('function');
    });

    it('should not require instantiation', () => {
      I18n.setLocale('en');
      const locale = I18n.getLocale();
      expect(locale).toBe('en');
    });
  });

  describe('Locale management', () => {
    it('should default to English', () => {
      expect(I18n.getLocale()).toBe('en');
    });

    it('should switch to Portuguese', () => {
      I18n.setLocale('pt-BR');
      expect(I18n.getLocale()).toBe('pt-BR');
    });

    it('should persist locale changes', () => {
      I18n.setLocale('pt-BR');
      expect(I18n.getLocale()).toBe('pt-BR');
      
      const translation = I18n.t('cli.version');
      expect(translation).toBe('Versão');
    });

    it('should ignore invalid locales', () => {
      I18n.setLocale('en');
      I18n.setLocale('invalid' as any);
      expect(I18n.getLocale()).toBe('en');
    });
  });

  describe('English translations', () => {
    beforeEach(() => {
      I18n.setLocale('en');
    });

    it('should translate CLI description', () => {
      expect(I18n.t('cli.description')).toBe('Loom — weave many agents and model providers into one CLI workflow');
    });

    it('should translate CLI version label', () => {
      expect(I18n.t('cli.version')).toBe('Version');
    });

    it('should translate CLI help label', () => {
      expect(I18n.t('cli.help')).toBe('Help');
    });

    it('should translate chat command description', () => {
      expect(I18n.t('cli.commands.chat')).toBe('Start a chat session');
    });

    it('should translate version command description', () => {
      expect(I18n.t('cli.commands.version')).toBe('Show version');
    });

    it('should translate help command description', () => {
      expect(I18n.t('cli.commands.help')).toBe('Show help');
    });

    it('should translate provider not configured error', () => {
      const error = I18n.t('errors.providerNotConfigured');
      expect(error).toBe('No provider configured. Set OPENAI_API_KEY or configure a provider.');
    });

    it('should translate invalid config error', () => {
      expect(I18n.t('errors.invalidConfig')).toBe('Invalid configuration');
    });

    it('should translate chat failed error', () => {
      expect(I18n.t('errors.chatFailed')).toBe('Chat request failed');
    });

    it('should support dynamic provider blocked error', () => {
      const errorFn = I18n.t('errors.providerBlocked');
      expect(typeof errorFn).toBe('function');
      expect(errorFn('Test')).toBe('Test provider is currently blocked. See documentation for details.');
    });
  });

  describe('Portuguese translations', () => {
    beforeEach(() => {
      I18n.setLocale('pt-BR');
    });

    it('should translate CLI description to Portuguese', () => {
      expect(I18n.t('cli.description')).toBe('Loom — teça múltiplos agentes e provedores de modelo em um fluxo de trabalho CLI');
    });

    it('should translate version label to Portuguese', () => {
      expect(I18n.t('cli.version')).toBe('Versão');
    });

    it('should translate help label to Portuguese', () => {
      expect(I18n.t('cli.help')).toBe('Ajuda');
    });

    it('should translate chat command to Portuguese', () => {
      expect(I18n.t('cli.commands.chat')).toBe('Iniciar uma sessão de chat');
    });

    it('should translate version command to Portuguese', () => {
      expect(I18n.t('cli.commands.version')).toBe('Mostrar versão');
    });

    it('should translate help command to Portuguese', () => {
      expect(I18n.t('cli.commands.help')).toBe('Mostrar ajuda');
    });

    it('should translate provider not configured error to Portuguese', () => {
      const error = I18n.t('errors.providerNotConfigured');
      expect(error).toBe('Nenhum provedor configurado. Defina OPENAI_API_KEY ou configure um provedor.');
    });

    it('should translate invalid config error to Portuguese', () => {
      expect(I18n.t('errors.invalidConfig')).toBe('Configuração inválida');
    });

    it('should translate chat failed error to Portuguese', () => {
      expect(I18n.t('errors.chatFailed')).toBe('Falha na solicitação de chat');
    });

    it('should support dynamic provider blocked error in Portuguese', () => {
      const errorFn = I18n.t('errors.providerBlocked');
      expect(typeof errorFn).toBe('function');
      expect(errorFn('Teste')).toBe('Provedor Teste está atualmente bloqueado. Consulte a documentação para detalhes.');
    });
  });

  describe('Translation lookup', () => {
    it('should handle nested keys', () => {
      expect(I18n.t('cli.commands.chat')).toBeTruthy();
      expect(I18n.t('errors.invalidConfig')).toBeTruthy();
    });

    it('should return key for missing translation', () => {
      expect(I18n.t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should return key for partial path', () => {
      expect(I18n.t('cli.nonexistent')).toBe('cli.nonexistent');
    });

    it('should handle empty key gracefully', () => {
      expect(I18n.t('')).toBe('');
    });
  });

  describe('Locale switching', () => {
    it('should switch translations when locale changes', () => {
      I18n.setLocale('en');
      const enVersion = I18n.t('cli.version');
      expect(enVersion).toBe('Version');

      I18n.setLocale('pt-BR');
      const ptVersion = I18n.t('cli.version');
      expect(ptVersion).toBe('Versão');

      expect(enVersion).not.toBe(ptVersion);
    });

    it('should affect all subsequent translations', () => {
      I18n.setLocale('pt-BR');
      
      expect(I18n.t('cli.description')).toContain('teça');
      expect(I18n.t('cli.version')).toBe('Versão');
      expect(I18n.t('cli.help')).toBe('Ajuda');
    });
  });

  describe('Bilingual coverage (EN + PT-BR)', () => {
    it('should have matching keys in both languages', () => {
      const enKeys = getAllKeys(strings.en);
      const ptKeys = getAllKeys(strings['pt-BR']);

      expect(enKeys.sort()).toEqual(ptKeys.sort());
    });

    it('should translate all CLI strings in both languages', () => {
      const cliKeys = [
        'cli.description',
        'cli.version',
        'cli.help',
        'cli.commands.chat',
        'cli.commands.version',
        'cli.commands.help',
      ];

      I18n.setLocale('en');
      for (const key of cliKeys) {
        expect(I18n.t(key)).not.toBe(key);
      }

      I18n.setLocale('pt-BR');
      for (const key of cliKeys) {
        expect(I18n.t(key)).not.toBe(key);
      }
    });

    it('should translate all error strings in both languages', () => {
      const errorKeys = [
        'errors.providerNotConfigured',
        'errors.invalidConfig',
        'errors.chatFailed',
      ];

      I18n.setLocale('en');
      for (const key of errorKeys) {
        expect(I18n.t(key)).not.toBe(key);
      }

      I18n.setLocale('pt-BR');
      for (const key of errorKeys) {
        expect(I18n.t(key)).not.toBe(key);
      }
    });
  });

  describe('String structure', () => {
    it('should have separate CLI section', () => {
      expect(strings.en.cli).toBeDefined();
      expect(strings['pt-BR'].cli).toBeDefined();
    });

    it('should have separate errors section', () => {
      expect(strings.en.errors).toBeDefined();
      expect(strings['pt-BR'].errors).toBeDefined();
    });

    it('should support function-based dynamic strings', () => {
      const providerBlocked = I18n.t('errors.providerBlocked');
      expect(typeof providerBlocked).toBe('function');
    });
  });
});

function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && typeof obj[key] !== 'function') {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}
