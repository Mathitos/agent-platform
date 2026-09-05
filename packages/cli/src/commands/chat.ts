import { ProviderAdapter, I18n } from '@loom/core';
import { OpenAIProvider, OpenAICompatibleProvider } from '@loom/providers';
import * as readline from 'readline';

export class ChatCommand {
  static async execute(args: string[]): Promise<void> {
    const provider = this.createProvider();
    const isSingleTurn = args.length > 0;

    if (isSingleTurn) {
      await this.singleTurn(provider, args.join(' '));
    } else {
      await this.repl(provider);
    }
  }

  private static createProvider(): ProviderAdapter {
    if (process.env.OPENAI_API_KEY) {
      return OpenAIProvider.fromEnv();
    }

    if (process.env.OPENAI_COMPATIBLE_BASE_URL && process.env.OPENAI_COMPATIBLE_API_KEY) {
      return new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
        model: process.env.OPENAI_COMPATIBLE_MODEL,
      });
    }

    const t = I18n.t.bind(I18n);
    throw new Error(t('errors.providerNotConfigured'));
  }

  private static async singleTurn(provider: ProviderAdapter, message: string): Promise<void> {
    try {
      const t = I18n.t.bind(I18n);
      console.log(`\n[${provider.getName()}]`);
      const response = await provider.chat({
        messages: [{ role: 'user', content: message }],
      });
      console.log(`\n${response.content || t('chat.noResponse')}\n`);
      if (response.usage) {
        console.log(t('chat.tokens')(response.usage.totalTokens, response.usage.promptTokens, response.usage.completionTokens));
      }
    } catch (error) {
      const t = I18n.t.bind(I18n);
      console.error(`${t('errors.chatFailed')}: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private static async repl(provider: ProviderAdapter): Promise<void> {
    const t = I18n.t.bind(I18n);
    console.log(`\n${t('chat.header')(provider.getName())}`);
    console.log(`${t('chat.prompt')}\n`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
    });

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    rl.prompt();

    rl.on('line', async (line: string) => {
      const input = line.trim();

      if (!input) {
        rl.prompt();
        return;
      }

      if (input === 'exit' || input === 'quit') {
        console.log(`\n${t('chat.goodbye')}\n`);
        rl.close();
        return;
      }

      messages.push({ role: 'user', content: input });

      try {
        const response = await provider.chat({ messages });
        const content = response.content || '';
        console.log(`\n${content}\n`);
        messages.push({ role: 'assistant', content });
      } catch (error) {
        const t = I18n.t.bind(I18n);
        console.error(`${t('errors.chatFailed')}: ${error instanceof Error ? error.message : String(error)}`);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      process.exit(0);
    });
  }
}
