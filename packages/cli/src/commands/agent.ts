import { ProviderAdapter, I18n } from '@loom/core';
import { OpenAIProvider, OpenAICompatibleProvider } from '@loom/providers';
import { AgentExecutor } from '@loom/agent';
import * as readline from 'readline';

export class AgentCommand {
  static async execute(args: string[]): Promise<void> {
    const provider = this.createProvider();
    const workspaceRoot = process.cwd();
    const isSingleTurn = args.length > 0;

    if (isSingleTurn) {
      await this.singleTurn(provider, workspaceRoot, args.join(' '));
    } else {
      await this.repl(provider, workspaceRoot);
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

  private static async singleTurn(
    provider: ProviderAdapter,
    workspaceRoot: string,
    message: string
  ): Promise<void> {
    try {
      console.log(`\n[${provider.getName()} Agent with Tools]`);
      console.log(`Workspace: ${workspaceRoot}`);
      console.log('');

      const agent = new AgentExecutor(provider, {
        workspaceRoot,
        userId: 'default',
        trustedPaths: [],
      });

      const result = await agent.executeTurn(message);

      // Display conversation
      for (let i = 1; i < result.messages.length; i++) {
        const msg = result.messages[i];

        if (msg.role === 'assistant') {
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            console.log(`\n[Assistant] Calling tools:`);
            for (const toolCall of msg.tool_calls) {
              console.log(`  - ${toolCall.function.name}(${toolCall.function.arguments})`);
            }
          }
          if (msg.content) {
            console.log(`\n[Assistant] ${msg.content}`);
          }
        } else if (msg.role === 'tool') {
          console.log(`\n[Tool: ${msg.name}] ${msg.content}`);
        }
      }

      console.log(`\n---`);
      console.log(`Iterations: ${result.iterations}, Tool calls: ${result.toolCalls}\n`);
    } catch (error) {
      const t = I18n.t.bind(I18n);
      console.error(`${t('errors.chatFailed')}: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private static async repl(provider: ProviderAdapter, workspaceRoot: string): Promise<void> {
    console.log(`\nLoom Agent [${provider.getName()}] with Tools`);
    console.log(`Workspace: ${workspaceRoot}`);
    console.log('Type your message and press Enter. Type "exit" or "quit" to leave.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
    });

    const agent = new AgentExecutor(provider, {
      workspaceRoot,
      userId: 'default',
      trustedPaths: [],
    });

    let conversationHistory: any[] = [];

    rl.prompt();

    rl.on('line', async (line: string) => {
      const input = line.trim();

      if (!input) {
        rl.prompt();
        return;
      }

      if (input === 'exit' || input === 'quit') {
        console.log('\nGoodbye!\n');
        rl.close();
        return;
      }

      try {
        const result = await agent.executeTurn(input, conversationHistory);

        // Display new messages
        for (let i = conversationHistory.length; i < result.messages.length; i++) {
          const msg = result.messages[i];

          if (msg.role === 'assistant') {
            if (msg.tool_calls && msg.tool_calls.length > 0) {
              console.log(`\n[Tools]:`);
              for (const toolCall of msg.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                console.log(`  ${toolCall.function.name}(${JSON.stringify(args)})`);
              }
            }
            if (msg.content) {
              console.log(`\n${msg.content}`);
            }
          } else if (msg.role === 'tool') {
            // Don't show tool results to keep output clean
          }
        }

        conversationHistory = result.messages;

        console.log('');
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
