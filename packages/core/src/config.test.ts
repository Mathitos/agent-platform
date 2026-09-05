import { describe, it, expect } from 'vitest';
import { ConfigManager } from '../src/config';
import * as path from 'path';

describe('ConfigManager', () => {
  describe('Static class design', () => {
    it('should be a class with static methods', () => {
      expect(typeof ConfigManager).toBe('function');
      expect(typeof ConfigManager.getUserConfigPath).toBe('function');
      expect(typeof ConfigManager.getProjectConfigPath).toBe('function');
      expect(typeof ConfigManager.getDefaultUserConfig).toBe('function');
      expect(typeof ConfigManager.getDefaultProjectConfig).toBe('function');
    });

    it('should not require instantiation', () => {
      const path = ConfigManager.getUserConfigPath();
      expect(typeof path).toBe('string');
    });
  });

  describe('User-namespaced config paths', () => {
    it('should generate user-specific config path', () => {
      const path = ConfigManager.getUserConfigPath('alice');
      expect(path).toContain('.loom/users/alice/config.json');
    });

    it('should use default user id when not specified', () => {
      const path = ConfigManager.getUserConfigPath();
      expect(path).toContain('.loom/users/default/config.json');
    });

    it('should support multiple user namespaces', () => {
      const alice = ConfigManager.getUserConfigPath('alice');
      const bob = ConfigManager.getUserConfigPath('bob');
      const charlie = ConfigManager.getUserConfigPath('charlie');

      expect(alice).toContain('alice');
      expect(bob).toContain('bob');
      expect(charlie).toContain('charlie');
      expect(alice).not.toBe(bob);
      expect(bob).not.toBe(charlie);
    });

    it('should prevent global singleton by design', () => {
      const defaultPath = ConfigManager.getUserConfigPath();
      const customPath = ConfigManager.getUserConfigPath('custom-user');

      expect(defaultPath).not.toBe(customPath);
      expect(defaultPath).toContain('default');
      expect(customPath).toContain('custom-user');
    });

    it('should use HOME or USERPROFILE for user config root', () => {
      const configPath = ConfigManager.getUserConfigPath();
      const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
      expect(configPath).toContain(home);
    });

    it('should fallback to /tmp when no home directory', () => {
      const originalHome = process.env.HOME;
      const originalUserProfile = process.env.USERPROFILE;

      delete process.env.HOME;
      delete process.env.USERPROFILE;

      const configPath = ConfigManager.getUserConfigPath();
      expect(configPath).toContain('/tmp');

      if (originalHome) process.env.HOME = originalHome;
      if (originalUserProfile) process.env.USERPROFILE = originalUserProfile;
    });

    it('should include .loom directory in path', () => {
      const configPath = ConfigManager.getUserConfigPath();
      expect(configPath).toContain('.loom');
    });

    it('should include users subdirectory', () => {
      const configPath = ConfigManager.getUserConfigPath();
      expect(configPath).toContain('users');
    });

    it('should end with config.json', () => {
      const configPath = ConfigManager.getUserConfigPath('test');
      expect(configPath).toMatch(/config\.json$/);
    });
  });

  describe('Project-scoped config paths', () => {
    it('should generate project config path', () => {
      const configPath = ConfigManager.getProjectConfigPath();
      expect(configPath).toBe('.loom/config.json');
    });

    it('should be relative to project root', () => {
      const configPath = ConfigManager.getProjectConfigPath();
      expect(configPath).toMatch(/^\.loom/);
      expect(configPath).not.toMatch(/^\//);
    });

    it('should not depend on user namespace', () => {
      const projectPath = ConfigManager.getProjectConfigPath();
      expect(projectPath).not.toContain('users');
      expect(projectPath).not.toContain('default');
    });
  });

  describe('Default configurations', () => {
    it('should provide default user config', () => {
      const config = ConfigManager.getDefaultUserConfig();
      expect(config).toHaveProperty('userId');
      expect(config).toHaveProperty('locale');
    });

    it('should default to "default" user id', () => {
      const config = ConfigManager.getDefaultUserConfig();
      expect(config.userId).toBe('default');
    });

    it('should default to English locale', () => {
      const config = ConfigManager.getDefaultUserConfig();
      expect(config.locale).toBe('en');
    });

    it('should provide default project config', () => {
      const config = ConfigManager.getDefaultProjectConfig();
      expect(config).toHaveProperty('providers');
    });

    it('should default to empty providers', () => {
      const config = ConfigManager.getDefaultProjectConfig();
      expect(config.providers).toEqual({});
    });

    it('should allow optional defaultProvider in project config', () => {
      const config = ConfigManager.getDefaultProjectConfig();
      expect(config.defaultProvider).toBeUndefined();
    });
  });

  describe('Config structure for future multi-user support', () => {
    it('should structure paths to allow switching users', () => {
      const user1 = ConfigManager.getUserConfigPath('user1');
      const user2 = ConfigManager.getUserConfigPath('user2');

      expect(user1).toMatch(/users\/user1/);
      expect(user2).toMatch(/users\/user2/);
    });

    it('should not hardcode single-user assumption in paths', () => {
      const path = ConfigManager.getUserConfigPath();
      expect(path).toContain('users/');
    });

    it('should support user id as parameter everywhere', () => {
      expect(ConfigManager.getUserConfigPath('alice')).toBeTruthy();
      expect(ConfigManager.getUserConfigPath('bob')).toBeTruthy();
      expect(ConfigManager.getUserConfigPath('team-shared')).toBeTruthy();
    });
  });

  describe('No global singleton config', () => {
    it('should not export global config instance', () => {
      expect(ConfigManager).not.toHaveProperty('instance');
      expect(ConfigManager).not.toHaveProperty('singleton');
      expect(ConfigManager).not.toHaveProperty('current');
    });

    it('should require user id parameter or use explicit default', () => {
      const withoutId = ConfigManager.getUserConfigPath();
      const withDefaultId = ConfigManager.getUserConfigPath('default');

      expect(withoutId).toBe(withDefaultId);
    });

    it('should allow multiple config paths in same process', () => {
      const paths = [
        ConfigManager.getUserConfigPath('user1'),
        ConfigManager.getUserConfigPath('user2'),
        ConfigManager.getUserConfigPath('user3'),
      ];

      expect(new Set(paths).size).toBe(3);
    });
  });

  describe('Type safety', () => {
    it('should have typed user config', () => {
      const config = ConfigManager.getDefaultUserConfig();
      expect(config.locale).toMatch(/^(en|pt-BR)$/);
    });

    it('should have typed project config', () => {
      const config = ConfigManager.getDefaultProjectConfig();
      expect(typeof config.providers).toBe('object');
    });
  });
});
