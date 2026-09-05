import {
  RunState,
  StepState,
  WorkflowReport,
  WorkflowStatusOptions,
  WorkflowLogsOptions,
  WorkflowReportOptions,
  TelemetryEvent,
} from './types';
import { TelemetryStore } from './telemetry-store';

export class WorkflowObservability {
  private telemetryStore: TelemetryStore;

  constructor(userId?: string) {
    this.telemetryStore = new TelemetryStore({ userId: userId || 'default' });
  }

  status(options: WorkflowStatusOptions): string {
    const stateData = this.telemetryStore.loadState(options.runId);

    if (!stateData) {
      return `Run not found: ${options.runId}`;
    }

    const output: string[] = [];
    output.push(`\n=== Workflow Status ===`);
    output.push(`Run ID: ${stateData.runId}`);
    output.push(`Workflow: ${stateData.workflowName}`);
    output.push(`Status: ${stateData.status}`);
    output.push(`Created: ${stateData.createdAt}`);
    output.push(`Updated: ${stateData.updatedAt}`);

    if (stateData.pauseReason) {
      output.push(`Pause Reason: ${stateData.pauseReason}`);
    }

    if (stateData.budgets && typeof stateData.budgets === 'object') {
      const budgets = stateData.budgets as any;
      output.push(`\n--- Budgets ---`);
      output.push(`Tokens Used: ${budgets.tokensUsed || 0}`);
      output.push(`Cost Incurred: $${(budgets.costIncurred || 0).toFixed(2)}`);
      output.push(`Elapsed Time: ${this.formatDuration(Date.now() - (budgets.wallClockStartMs || Date.now()))}`);
      output.push(`Retries Used: ${budgets.retriesUsed || 0}`);
    }

    if (stateData.steps && typeof stateData.steps === 'object') {
      output.push(`\n--- Steps ---`);
      for (const [stepId, stepState] of Object.entries(stateData.steps as Record<string, StepState>)) {
        const icon = this.getStatusIcon(stepState.status);
        output.push(`${icon} ${stepId}: ${stepState.status} (attempts: ${stepState.attempts})`);

        if (stepState.error) {
          output.push(`  Error: ${stepState.error}`);
        }
        if (stepState.tokensUsed) {
          output.push(`  Tokens: ${stepState.tokensUsed}`);
        }
        if (stepState.costIncurred) {
          output.push(`  Cost: $${stepState.costIncurred.toFixed(2)}`);
        }
      }
    }

    return output.join('\n');
  }

  logs(options: WorkflowLogsOptions): string {
    const events = this.telemetryStore.listByRun(options.runId, {
      eventType: options.eventType,
      limit: options.limit,
    });

    if (events.length === 0) {
      return `No logs found for run: ${options.runId}`;
    }

    const output: string[] = [];
    output.push(`\n=== Workflow Logs ===`);
    output.push(`Run ID: ${options.runId}`);
    output.push(`Total Events: ${events.length}\n`);

    for (const event of events) {
      output.push(`[${event.ts}] ${event.type}`);
      output.push(`  ${JSON.stringify(event.payload, null, 2)}`);
    }

    return output.join('\n');
  }

  report(options: WorkflowReportOptions): WorkflowReport {
    const stateData = this.telemetryStore.loadState(options.runId);

    if (!stateData) {
      throw new Error(`Run not found: ${options.runId}`);
    }

    const events = this.telemetryStore.listByRun(options.runId);

    let tokensUsed = 0;
    let costIncurred = 0;
    let stepsCompleted = 0;
    let stepsFailed = 0;
    const artifacts: string[] = [];

    if (stateData.budgets && typeof stateData.budgets === 'object') {
      const budgets = stateData.budgets as any;
      tokensUsed = budgets.tokensUsed || 0;
      costIncurred = budgets.costIncurred || 0;
    }

    if (stateData.steps && typeof stateData.steps === 'object') {
      for (const stepState of Object.values(stateData.steps as Record<string, StepState>)) {
        if (stepState.status === 'completed') {
          stepsCompleted++;
        } else if (stepState.status === 'failed') {
          stepsFailed++;
        }
      }
    }

    for (const event of events) {
      if (event.type === 'artifact_created' && event.payload.artifactUrl) {
        artifacts.push(event.payload.artifactUrl as string);
      }
    }

    const startedEvent = events.find(e => e.type === 'run_started');
    const completedEvent = events.find(e => e.type === 'run_completed' || e.type === 'run_failed');

    let duration = 0;
    if (startedEvent && completedEvent) {
      duration = new Date(completedEvent.ts).getTime() - new Date(startedEvent.ts).getTime();
    } else if (startedEvent) {
      duration = Date.now() - new Date(startedEvent.ts).getTime();
    }

    return {
      runId: options.runId,
      workflowName: stateData.workflowName as string,
      status: stateData.status as any,
      duration,
      tokensUsed,
      costIncurred,
      stepsCompleted,
      stepsFailed,
      retriesUsed: (stateData.budgets as any)?.retriesUsed || 0,
      artifacts,
    };
  }

  formatReport(report: WorkflowReport): string {
    const output: string[] = [];

    output.push(`\n=== Workflow Report ===`);
    output.push(`Run ID: ${report.runId}`);
    output.push(`Workflow: ${report.workflowName}`);
    output.push(`Status: ${report.status}`);
    output.push(`\n--- Performance ---`);
    output.push(`Duration: ${this.formatDuration(report.duration)}`);
    output.push(`Tokens Used: ${report.tokensUsed.toLocaleString()}`);
    output.push(`Cost Incurred: $${report.costIncurred.toFixed(2)}`);
    output.push(`\n--- Steps ---`);
    output.push(`Completed: ${report.stepsCompleted}`);
    output.push(`Failed: ${report.stepsFailed}`);
    output.push(`Retries Used: ${report.retriesUsed}`);

    if (report.artifacts.length > 0) {
      output.push(`\n--- Artifacts ---`);
      for (const artifact of report.artifacts) {
        output.push(`- ${artifact}`);
      }
    }

    return output.join('\n');
  }

  listRuns(): string[] {
    return this.telemetryStore.listRuns();
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: '⏸️',
      running: '▶️',
      completed: '✅',
      failed: '❌',
      paused: '⏸️',
    };

    return icons[status] || '•';
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
