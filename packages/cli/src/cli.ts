import { I18n } from '@loom/core';

export class CLI {
  private static readonly VERSION = '0.1.0';

  static run(args: string[]): void {
    // Initialize locale from environment
    I18n.initFromEnv();

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
      case 'locale':
        this.runLocale(args.slice(1));
        break;
      case 'workflow':
        this.runWorkflow(args.slice(1));
        break;
      default:
        const t = I18n.t.bind(I18n);
        console.error(t('cli.unknownCommand')(command));
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
    console.log(`  loom agent [message]   ${t('cli.commands.agent')}`);
    console.log(`  loom git <subcommand>  Git operations (status, diff, commit, branch-info)`);
    console.log(`  loom workflow          Multi-agent workflow runner (M5)`);
    console.log(`  loom locale [locale]   ${t('cli.commands.locale')}`);
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

  static async runWorkflow(args: string[]): Promise<void> {
    const { WorkflowCommand } = await import('./commands/workflow');
    await WorkflowCommand.execute(args);
  }

  static runLocale(args: string[]): void {
    const t = I18n.t.bind(I18n);
    
    if (args.length === 0) {
      // Show current locale
      console.log(t('locale.current')(I18n.getLocale()));
      console.log(t('locale.available'));
      return;
    }

    const newLocale = args[0];
    const availableLocales = I18n.getAvailableLocales();
    
    if (availableLocales.includes(newLocale as any)) {
      I18n.setLocale(newLocale as any);
      console.log(t('locale.set')(newLocale));
    } else {
      console.error(t('locale.invalid')(newLocale));
      process.exit(1);
    }
  }

  static getVersion(): string {
    return this.VERSION;
  }
}
