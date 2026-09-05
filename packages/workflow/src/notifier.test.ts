import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkflowNotifier } from './notifier';
import { I18n } from '@loom/core';
import notifier from 'node-notifier';

vi.mock('node-notifier', () => ({
  default: {
    notify: vi.fn(),
  },
}));

describe('WorkflowNotifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    WorkflowNotifier.resetForTesting();
    I18n.setLocale('en');
  });

  afterEach(() => {
    WorkflowNotifier.resetForTesting();
  });

  describe('notifySuccess', () => {
    it('should send success notification with correct title and message', () => {
      const mockNotify = vi.mocked(notifier.notify);
      mockNotify.mockImplementation((options: any, callback?: any) => {
        if (callback) callback(null, 'response');
        return notifier;
      });

      WorkflowNotifier.notifySuccess('build-pr');

      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Workflow Complete',
          message: 'Workflow "build-pr" completed successfully',
          sound: true,
          wait: false,
        }),
        expect.any(Function)
      );
    });

    it('should use Portuguese strings when locale is pt-BR', () => {
      I18n.setLocale('pt-BR');
      const mockNotify = vi.mocked(notifier.notify);
      mockNotify.mockImplementation((options: any, callback?: any) => {
        if (callback) callback(null, 'response');
        return notifier;
      });

      WorkflowNotifier.notifySuccess('build-pr');

      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fluxo de Trabalho Concluído',
          message: 'Fluxo de trabalho "build-pr" concluído com sucesso',
        }),
        expect.any(Function)
      );
    });
  });

  describe('notifyFailure', () => {
    it('should send failure notification with correct title and message', () => {
      const mockNotify = vi.mocked(notifier.notify);
      mockNotify.mockImplementation((options: any, callback?: any) => {
        if (callback) callback(null, 'response');
        return notifier;
      });

      WorkflowNotifier.notifyFailure('build-pr');

      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Workflow Failed',
          message: 'Workflow "build-pr" failed',
          sound: true,
          wait: false,
        }),
        expect.any(Function)
      );
    });

    it('should use Portuguese strings when locale is pt-BR', () => {
      I18n.setLocale('pt-BR');
      const mockNotify = vi.mocked(notifier.notify);
      mockNotify.mockImplementation((options: any, callback?: any) => {
        if (callback) callback(null, 'response');
        return notifier;
      });

      WorkflowNotifier.notifyFailure('build-pr');

      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fluxo de Trabalho Falhou',
          message: 'Fluxo de trabalho "build-pr" falhou',
        }),
        expect.any(Function)
      );
    });
  });

  describe('graceful degradation', () => {
    it('should log once and continue when notifier callback reports error', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockNotify = vi.mocked(notifier.notify);
      mockNotify.mockImplementation((options: any, callback?: any) => {
        if (callback) callback(new Error('Notifier unavailable'), '');
        return notifier;
      });

      WorkflowNotifier.notifySuccess('test-workflow');
      WorkflowNotifier.notifySuccess('another-workflow');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Loom] OS notifications unavailable on this system (this is OK, continuing normally)'
      );
      expect(mockNotify).toHaveBeenCalledTimes(1);
    });

    it('should log once and continue when notifier throws exception', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockNotify = vi.mocked(notifier.notify);
      mockNotify.mockImplementation(() => {
        throw new Error('Notifier not supported');
      });

      WorkflowNotifier.notifyFailure('test-workflow');
      WorkflowNotifier.notifyFailure('another-workflow');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Loom] OS notifications unavailable on this system (this is OK, continuing normally)'
      );
      expect(mockNotify).toHaveBeenCalledTimes(1);
    });

    it('should not send subsequent notifications after notifier is unavailable', () => {
      const mockNotify = vi.mocked(notifier.notify);
      mockNotify.mockImplementation((options: any, callback?: any) => {
        if (callback) callback(new Error('Unavailable'), '');
        return notifier;
      });

      WorkflowNotifier.notifySuccess('workflow-1');
      expect(mockNotify).toHaveBeenCalledTimes(1);

      WorkflowNotifier.notifySuccess('workflow-2');
      expect(mockNotify).toHaveBeenCalledTimes(1);

      WorkflowNotifier.notifyFailure('workflow-3');
      expect(mockNotify).toHaveBeenCalledTimes(1);
    });
  });

  describe('successful notification', () => {
    it('should not log when notification succeeds', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockNotify = vi.mocked(notifier.notify);
      mockNotify.mockImplementation((options: any, callback?: any) => {
        if (callback) callback(null, 'response');
        return notifier;
      });

      WorkflowNotifier.notifySuccess('test-workflow');

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockNotify).toHaveBeenCalledTimes(1);
    });
  });
});
