export const strings = {
  en: {
    cli: {
      description: 'Loom — weave many agents and model providers into one CLI workflow',
      version: 'Version',
      help: 'Help',
      commands: {
        chat: 'Start a chat session',
        version: 'Show version',
        help: 'Show help',
      },
    },
    errors: {
      providerNotConfigured: 'No provider configured. Set OPENAI_API_KEY or configure a provider.',
      providerBlocked: (name: string) => `${name} provider is currently blocked. See documentation for details.`,
      invalidConfig: 'Invalid configuration',
      chatFailed: 'Chat request failed',
    },
  },
  'pt-BR': {
    cli: {
      description: 'Loom — teça múltiplos agentes e provedores de modelo em um fluxo de trabalho CLI',
      version: 'Versão',
      help: 'Ajuda',
      commands: {
        chat: 'Iniciar uma sessão de chat',
        version: 'Mostrar versão',
        help: 'Mostrar ajuda',
      },
    },
    errors: {
      providerNotConfigured: 'Nenhum provedor configurado. Defina OPENAI_API_KEY ou configure um provedor.',
      providerBlocked: (name: string) => `Provedor ${name} está atualmente bloqueado. Consulte a documentação para detalhes.`,
      invalidConfig: 'Configuração inválida',
      chatFailed: 'Falha na solicitação de chat',
    },
  },
};

export type Locale = keyof typeof strings;

export class I18n {
  private static currentLocale: Locale = 'en';

  static setLocale(locale: Locale): void {
    if (locale in strings) {
      this.currentLocale = locale;
    }
  }

  static getLocale(): Locale {
    return this.currentLocale;
  }

  static t(key: string): any {
    const keys = key.split('.');
    let value: any = strings[this.currentLocale];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }

    return value;
  }
}
