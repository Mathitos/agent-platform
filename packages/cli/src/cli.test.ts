import { describe, it, expect } from 'vitest';
import { CLI } from '../src/cli';

describe('CLI', () => {
  it('should return version', () => {
    const version = CLI.getVersion();
    expect(version).toBe('0.1.0');
  });

  it('should have static methods', () => {
    expect(typeof CLI.run).toBe('function');
    expect(typeof CLI.showHelp).toBe('function');
    expect(typeof CLI.showVersion).toBe('function');
    expect(typeof CLI.getVersion).toBe('function');
  });
});
