import { describe, it, expect } from 'vitest';
import { ConfigManager } from '../src/config';

describe('ConfigManager', () => {
  it('should generate user config path', () => {
    const path = ConfigManager.getUserConfigPath('test-user');
    expect(path).toContain('.loom/users/test-user/config.json');
  });

  it('should use default user id', () => {
    const path = ConfigManager.getUserConfigPath();
    expect(path).toContain('.loom/users/default/config.json');
  });

  it('should generate project config path', () => {
    const path = ConfigManager.getProjectConfigPath();
    expect(path).toBe('.loom/config.json');
  });

  it('should provide default user config', () => {
    const config = ConfigManager.getDefaultUserConfig();
    expect(config.userId).toBe('default');
    expect(config.locale).toBe('en');
  });

  it('should provide default project config', () => {
    const config = ConfigManager.getDefaultProjectConfig();
    expect(config.providers).toEqual({});
  });
});
