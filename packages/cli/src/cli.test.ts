import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLI } from '../src/cli';
import { I18n } from '@loom/core';

describe('CLI - Comprehensive Routing Tests', () => {
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

  describe('Version command routing', () => {
    it('should invoke showVersion for "version" command', () => {
      CLI.run(['version']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0.1.0'));
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should invoke showVersion for "--version" flag', () => {
      CLI.run(['--version']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0.1.0'));
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should invoke showVersion for "-v" flag', () => {
      CLI.run(['-v']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0.1.0'));
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should include version label in output', () => {
      I18n.setLocale('en');
      CLI.run(['version']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Version'));
    });

    it('should use locale-specific version label', () => {
      I18n.setLocale('pt-BR');
      CLI.showVersion();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Versão'));
    });
  });

  describe('Help command routing', () => {
    it('should invoke showHelp with no arguments', () => {
      CLI.run([]);
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loom'));
    });

    it('should invoke showHelp with --help flag', () => {
      consoleLogSpy.mockClear();
      CLI.run(['--help']);
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loom'));
    });

    it('should invoke showHelp with -h flag', () => {
      consoleLogSpy.mockClear();
      CLI.run(['-h']);
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loom'));
    });

    it('should include description in help output', () => {
      CLI.run(['--help']);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('weave many agents')
      );
    });

    it('should list chat command in help', () => {
      CLI.run(['--help']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('loom chat'));
    });

    it('should list version command in help', () => {
      CLI.run(['--help']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('loom version'));
    });

    it('should list help command in help', () => {
      CLI.run(['--help']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('loom --help'));
    });

    it('should use locale-specific help text', () => {
      I18n.setLocale('pt-BR');
      consoleLogSpy.mockClear();
      CLI.showHelp();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('teça múltiplos agentes')
      );
    });
  });

  describe('Chat command routing', () => {
    it('should attempt to route to chat command', async () => {
      const runChatSpy = vi.spyOn(CLI, 'runChat').mockImplementation(async () => {});
      
      CLI.run(['chat']);
      
      expect(runChatSpy).toHaveBeenCalledWith([]);
      runChatSpy.mockRestore();
    });

    it('should pass arguments to chat command', async () => {
      const runChatSpy = vi.spyOn(CLI, 'runChat').mockImplementation(async () => {});
      
      CLI.run(['chat', 'hello', 'world']);
      
      expect(runChatSpy).toHaveBeenCalledWith(['hello', 'world']);
      runChatSpy.mockRestore();
    });
  });

  describe('Unknown command routing', () => {
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

    it('should handle multiple unknown args', () => {
      CLI.run(['bad', 'command', 'with', 'args']);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unknown command: bad');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Argument parsing behavior', () => {
    it('should handle empty array as help', () => {
      CLI.run([]);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loom'));
    });

    it('should prioritize --help over other commands', () => {
      consoleLogSpy.mockClear();
      CLI.run(['version', '--help']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('loom chat'));
    });

    it('should handle -h mixed with args', () => {
      consoleLogSpy.mockClear();
      CLI.run(['somecommand', '-h']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Loom'));
    });

    it('should treat first arg as command', () => {
      CLI.run(['invalid', 'second', 'third']);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unknown command: invalid');
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
      consoleLogSpy.mockClear();
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
