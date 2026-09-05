export interface UserConfig {
  userId: string;
  locale: 'en' | 'pt-BR';
  defaultProvider?: string;
}

export interface ProjectConfig {
  providers: Record<string, any>;
  defaultProvider?: string;
}

export class ConfigManager {
  private static readonly DEFAULT_USER_ID = 'default';

  static getUserConfigPath(userId: string = this.DEFAULT_USER_ID): string {
    const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
    return `${home}/.loom/users/${userId}/config.json`;
  }

  static getProjectConfigPath(): string {
    return '.loom/config.json';
  }

  static getDefaultUserConfig(): UserConfig {
    return {
      userId: this.DEFAULT_USER_ID,
      locale: 'en',
    };
  }

  static getDefaultProjectConfig(): ProjectConfig {
    return {
      providers: {},
    };
  }
}
