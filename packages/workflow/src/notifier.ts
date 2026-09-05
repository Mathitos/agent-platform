import notifier from 'node-notifier';
import { I18n } from '@loom/core';

export class WorkflowNotifier {
  private static notificationAttempted = false;
  private static notificationUnavailable = false;

  static notifySuccess(workflowName: string): void {
    this.notify(workflowName, true);
  }

  static notifyFailure(workflowName: string): void {
    this.notify(workflowName, false);
  }

  private static notify(workflowName: string, success: boolean): void {
    if (this.notificationUnavailable) {
      return;
    }

    try {
      const t = I18n.t.bind(I18n);
      const title = success
        ? t('workflow.notification.successTitle')
        : t('workflow.notification.failureTitle');
      const message = success
        ? t('workflow.notification.successMessage')(workflowName)
        : t('workflow.notification.failureMessage')(workflowName);

      notifier.notify(
        {
          title,
          message,
          sound: true,
          wait: false,
        },
        (err) => {
          if (err && !this.notificationAttempted) {
            console.log(
              '[Loom] OS notifications unavailable on this system (this is OK, continuing normally)'
            );
            this.notificationAttempted = true;
            this.notificationUnavailable = true;
          }
        }
      );

      this.notificationAttempted = true;
    } catch (err) {
      if (!this.notificationAttempted) {
        console.log(
          '[Loom] OS notifications unavailable on this system (this is OK, continuing normally)'
        );
        this.notificationAttempted = true;
        this.notificationUnavailable = true;
      }
    }
  }

  static resetForTesting(): void {
    this.notificationAttempted = false;
    this.notificationUnavailable = false;
  }
}
