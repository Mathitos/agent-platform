export const strings = {
  en: {
    cli: {
      description: 'Loom — weave many agents and model providers into one CLI workflow',
      version: 'Version',
      help: 'Help',
      commands: {
        chat: 'Start a chat session',
        agent: 'Start agent with tools (M2: files, shell, memory)',
        locale: 'Show or set the locale (en, pt-BR)',
        version: 'Show version',
        help: 'Show help',
      },
      unknownCommand: (cmd: string) => `Unknown command: ${cmd}`,
    },
    locale: {
      current: (locale: string) => `Current locale: ${locale}`,
      set: (locale: string) => `Locale set to: ${locale}`,
      invalid: (locale: string) => `Invalid locale: ${locale}. Available: en, pt-BR`,
      available: 'Available locales: en, pt-BR',
    },
    chat: {
      header: (provider: string) => `Loom Chat [${provider}]`,
      prompt: 'Type your message and press Enter. Type "exit" or "quit" to leave.',
      goodbye: 'Goodbye!',
      noResponse: '(no response)',
      tokens: (total: number, prompt: number, completion: number) => 
        `Tokens: ${total} (prompt: ${prompt}, completion: ${completion})`,
    },
    agent: {
      header: (provider: string) => `[${provider} Agent with Tools]`,
      workspace: (path: string) => `Workspace: ${path}`,
      replHeader: (provider: string) => `Loom Agent [${provider}] with Tools`,
      callingTools: '[Assistant] Calling tools:',
      assistantLabel: '[Assistant]',
      toolLabel: (name: string) => `[Tool: ${name}]`,
      toolsLabel: '[Tools]:',
      separator: '---',
      summary: (iterations: number, toolCalls: number) => 
        `Iterations: ${iterations}, Tool calls: ${toolCalls}`,
      prompt: 'Type your message and press Enter. Type "exit" or "quit" to leave.',
      goodbye: 'Goodbye!',
    },
    errors: {
      providerNotConfigured: 'No provider configured. Set OPENAI_API_KEY or configure a provider.',
      providerBlocked: (name: string) => `${name} provider is currently blocked. See documentation for details.`,
      invalidConfig: 'Invalid configuration',
      chatFailed: 'Chat request failed',
      pathTraversal: 'Path traversal detected',
      pathOutsideTrusted: (path: string) => `Path outside trusted directories: ${path}`,
      pathNotAllowed: 'Path not allowed',
      missingPathParam: 'Missing or invalid "path" parameter',
      missingContentParam: 'Missing "content" parameter',
      fileNotFound: (path: string) => `File not found: ${path}`,
      notAFile: (path: string) => `Path is not a file: ${path}`,
      writeSuccess: (path: string) => `Successfully wrote to ${path}`,
      missingCommandParam: 'Missing or invalid "command" parameter',
      commandTimeout: (timeout: number) => `Command timed out after ${timeout}ms`,
      commandFailed: (code: string) => `Command failed with exit code ${code}`,
    },
  },
  'pt-BR': {
    cli: {
      description: 'Loom — teça múltiplos agentes e provedores de modelo em um fluxo de trabalho CLI',
      version: 'Versão',
      help: 'Ajuda',
      commands: {
        chat: 'Iniciar uma sessão de chat',
        agent: 'Iniciar agente com ferramentas (M2: arquivos, shell, memória)',
        locale: 'Mostrar ou definir o idioma (en, pt-BR)',
        version: 'Mostrar versão',
        help: 'Mostrar ajuda',
      },
      unknownCommand: (cmd: string) => `Comando desconhecido: ${cmd}`,
    },
    locale: {
      current: (locale: string) => `Idioma atual: ${locale}`,
      set: (locale: string) => `Idioma definido para: ${locale}`,
      invalid: (locale: string) => `Idioma inválido: ${locale}. Disponíveis: en, pt-BR`,
      available: 'Idiomas disponíveis: en, pt-BR',
    },
    chat: {
      header: (provider: string) => `Loom Chat [${provider}]`,
      prompt: 'Digite sua mensagem e pressione Enter. Digite "exit" ou "quit" para sair.',
      goodbye: 'Até logo!',
      noResponse: '(sem resposta)',
      tokens: (total: number, prompt: number, completion: number) => 
        `Tokens: ${total} (prompt: ${prompt}, conclusão: ${completion})`,
    },
    agent: {
      header: (provider: string) => `[Agente ${provider} com Ferramentas]`,
      workspace: (path: string) => `Área de trabalho: ${path}`,
      replHeader: (provider: string) => `Agente Loom [${provider}] com Ferramentas`,
      callingTools: '[Assistente] Chamando ferramentas:',
      assistantLabel: '[Assistente]',
      toolLabel: (name: string) => `[Ferramenta: ${name}]`,
      toolsLabel: '[Ferramentas]:',
      separator: '---',
      summary: (iterations: number, toolCalls: number) => 
        `Iterações: ${iterations}, Chamadas de ferramentas: ${toolCalls}`,
      prompt: 'Digite sua mensagem e pressione Enter. Digite "exit" ou "quit" para sair.',
      goodbye: 'Até logo!',
    },
    errors: {
      providerNotConfigured: 'Nenhum provedor configurado. Defina OPENAI_API_KEY ou configure um provedor.',
      providerBlocked: (name: string) => `Provedor ${name} está atualmente bloqueado. Consulte a documentação para detalhes.`,
      invalidConfig: 'Configuração inválida',
      chatFailed: 'Falha na solicitação de chat',
      pathTraversal: 'Travessia de caminho detectada',
      pathOutsideTrusted: (path: string) => `Caminho fora dos diretórios confiáveis: ${path}`,
      pathNotAllowed: 'Caminho não permitido',
      missingPathParam: 'Parâmetro "path" ausente ou inválido',
      missingContentParam: 'Parâmetro "content" ausente',
      fileNotFound: (path: string) => `Arquivo não encontrado: ${path}`,
      notAFile: (path: string) => `O caminho não é um arquivo: ${path}`,
      writeSuccess: (path: string) => `Escrito com sucesso em ${path}`,
      missingCommandParam: 'Parâmetro "command" ausente ou inválido',
      commandTimeout: (timeout: number) => `Comando expirou após ${timeout}ms`,
      commandFailed: (code: string) => `Comando falhou com código de saída ${code}`,
    },
  },
};

export type Locale = keyof typeof strings;

export class I18n {
  private static currentLocale: Locale = 'en';
  private static initialized = false;

  static initFromEnv(): void {
    if (this.initialized) {
      return;
    }
    const envLocale = process.env.LOOM_LOCALE;
    if (envLocale && envLocale in strings) {
      this.currentLocale = envLocale as Locale;
    }
    this.initialized = true;
  }

  static setLocale(locale: Locale): void {
    if (locale in strings) {
      this.currentLocale = locale;
    }
  }

  static getLocale(): Locale {
    return this.currentLocale;
  }

  static getAvailableLocales(): Locale[] {
    return Object.keys(strings) as Locale[];
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
