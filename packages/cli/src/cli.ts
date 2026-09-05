import { I18n } from '@loom/core';

export class CLI {
  private static readonly VERSION = '0.1.0';

  static run(args: string[]): void {
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    const command = args[0];

    switch (command) {
      case 'version':
      case '--version':
      case '-v':
        this.showVersion();
        break;
      case 'chat':
        this.runChat(args.slice(1));
        break;
      case 'agent':
        this.runAgent(args.slice(1));
        break;
      case 'git':
        this.runGit(args.slice(1));
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('');
        this.showHelp();
        process.exit(1);
    }
  }

  static showHelp(): void {
    const t = I18n.t.bind(I18n);
    console.log(`${t('cli.description')}\n`);
    console.log(`${t('cli.help')}:\n`);
    console.log(`  loom chat              ${t('cli.commands.chat')}`);
    console.log(`  loom agent [message]   Start agent with tools (M2: files, shell, memory)`);
    console.log(`  loom git <subcommand>  Git operations (status, diff, commit, branch-info)`);
    console.log(`  loom version           ${t('cli.commands.version')}`);
    console.log(`  loom --help            ${t('cli.commands.help')}`);
  }

  static showVersion(): void {
    const t = I18n.t.bind(I18n);
    console.log(`${t('cli.version')}: ${this.VERSION}`);
  }

  static async runChat(args: string[]): Promise<void> {
    const { ChatCommand } = await import('./commands/chat');
    await ChatCommand.execute(args);
  }

  static async runAgent(args: string[]): Promise<void> {
    const { AgentCommand } = await import('./commands/agent');
    await AgentCommand.execute(args);
  }

  static async runGit(args: string[]): Promise<void> {
    const { handleGitCommand } = await import('./commands/git');
    await handleGitCommand(args);
  }

  static getVersion(): string {
    return this.VERSION;
  }
}
