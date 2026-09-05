import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLI } from '../src/cli';
import { I18n } from '@loom/core';

describe('CLI', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    I18n.setLocale('en');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Static class design', () => {
    it('should be a class with static methods', () => {
      expect(typeof CLI).toBe('function');
      expect(typeof CLI.run).toBe('function');
      expect(typeof CLI.showHelp).toBe('function');
      expect(typeof CLI.showVersion).toBe('function');
      expect(typeof CLI.getVersion).toBe('function');
    });

    it('should not require instantiation', () => {
      expect(typeof CLI.run).toBe('function');
      CLI.showHelp();
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Version command', () => {
    it('should return version string', () => {
      const version = CLI.getVersion();
      expect(version).toBe('0.1.0');
    });

    it('should show version with "version" command', () => {
      CLI.run(['version']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0.1.0'));
    });

    it('should show version with "--version" flag', () => {
      CLI.run(['--version']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0.1.0'));
    });

    it('should show version with "-v" flag', () => {
      CLI.run(['-v']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0.1.0'));
    });

    it('should include "Version:" label in English', () => {
      I18n.setLocale('en');
      CLI.run(['version']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Version'));
    });

    it('should include "Versão:" label in Portuguese', () => {
      I18n.setLocale('pt-BR');
      CLI.showVersion();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Versão'));
    });
  });

  describe('Help command', () => {
    it('should show help with no arguments', () => {
      CLI.run([]);
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loom'));
    });

    it('should show help with --help flag', () => {
      CLI.run(['--help']);
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loom'));
    });

    it('should show help with -h flag', () => {
      CLI.run(['-h']);
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loom'));
    });

    it('should include description', () => {
      CLI.run(['--help']);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('weave many agents')
      );
    });

    it('should list chat command', () => {
      CLI.run(['--help']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('loom chat'));
    });

    it('should list version command', () => {
      CLI.run(['--help']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('loom version'));
    });

    it('should list help command', () => {
      CLI.run(['--help']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('loom --help'));
    });
  });

  describe('i18n integration', () => {
    it('should show English help by default', () => {
      I18n.setLocale('en');
      CLI.showHelp();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('weave many agents and model providers')
      );
    });

    it('should show Portuguese help when locale is pt-BR', () => {
      I18n.setLocale('pt-BR');
      CLI.showHelp();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('teça múltiplos agentes')
      );
    });

    it('should translate command descriptions', () => {
      I18n.setLocale('en');
      CLI.showHelp();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Start a chat session')
      );

      consoleLogSpy.mockClear();

      I18n.setLocale('pt-BR');
      CLI.showHelp();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Iniciar uma sessão de chat')
      );
    });
  });

  describe('Unknown command handling', () => {
    it('should error on unknown command', () => {
      CLI.run(['unknown']);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unknown command: unknown');
    });

    it('should show help after unknown command', () => {
      CLI.run(['invalid']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loom'));
    });

    it('should exit with code 1 on unknown command', () => {
      CLI.run(['badcmd']);
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Command routing', () => {
    it('should handle version command', () => {
      CLI.run(['version']);
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should handle help variations', () => {
      const helpArgs = [[], ['--help'], ['-h']];
      
      for (const args of helpArgs) {
        consoleLogSpy.mockClear();
        CLI.run(args);
        expect(consoleLogSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Class-based static design', () => {
    it('should prefer static methods over module-level functions', () => {
      expect(CLI.run).toBeDefined();
      expect(CLI.showHelp).toBeDefined();
      expect(CLI.showVersion).toBeDefined();
      expect(CLI.getVersion).toBeDefined();
      expect(CLI.runChat).toBeDefined();
    });

    it('should not require instantiation for any operation', () => {
      CLI.showHelp();
      CLI.showVersion();
      const version = CLI.getVersion();
      expect(version).toBe('0.1.0');
    });
  });
});
