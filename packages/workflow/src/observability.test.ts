import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { WorkflowObservability } from './observability';
import { TelemetryStore } from './telemetry-store';
import { TelemetryEvent } from './types';

describe('WorkflowObservability', () => {
  const testStorePath = path.join('/tmp', 'loom-test-observability', Math.random().toString(36).substr(2, 9));
  let observability: WorkflowObservability;
  let telemetryStore: TelemetryStore;
  let runId: string;

  beforeEach(() => {
    telemetryStore = new TelemetryStore({ userId: 'test-user', storePath: testStorePath });
    observability = new WorkflowObservability('test-user', testStorePath);
    runId = TelemetryStore.generateRunId();
  });

  afterEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.rmSync(testStorePath, { recursive: true });
    }
  });

  describe('status', () => {
    it('should return status for existing run', () => {
      telemetryStore.saveState(runId, {
        runId,
        workflowName: 'test-workflow',
        status: 'running',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: {
          step1: { stepId: 'step1', status: 'completed', attempts: 1 },
          step2: { stepId: 'step2', status: 'running', attempts: 1 },
        },
        budgets: {
          tokensUsed: 50000,
          costIncurred: 2.5,
          wallClockStartMs: Date.now() - 60000,
          retriesUsed: 0,
        },
      });

      const status = observability.status({ runId });

      expect(status).toContain(runId);
      expect(status).toContain('test-workflow');
      expect(status).toContain('running');
      expect(status).toContain('step1');
      expect(status).toContain('step2');
    });

    it('should show budget information', () => {
      telemetryStore.saveState(runId, {
        runId,
        workflowName: 'budget-test',
        status: 'running',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: {},
        budgets: {
          tokensUsed: 75000,
          costIncurred: 10.25,
          wallClockStartMs: Date.now() - 120000,
          retriesUsed: 2,
        },
      });

      const status = observability.status({ runId });

      expect(status).toContain('75000');
      expect(status).toContain('10.25');
      expect(status).toContain('2');
    });

    it('should show pause reason when paused', () => {
      telemetryStore.saveState(runId, {
        runId,
        workflowName: 'paused-workflow',
        status: 'paused',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pauseReason: 'Step failed after retries',
        steps: {},
        budgets: {
          tokensUsed: 0,
          costIncurred: 0,
          wallClockStartMs: Date.now(),
          retriesUsed: 0,
        },
      });

      const status = observability.status({ runId });

      expect(status).toContain('Step failed after retries');
    });

    it('should return error message for non-existent run', () => {
      const status = observability.status({ runId: 'non_existent_run' });

      expect(status).toContain('Run not found');
    });
  });

  describe('logs', () => {
    it('should return logs for existing run', () => {
      telemetryStore.append({
        id: 'evt_1',
        runId,
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: { workflowName: 'test' },
      });

      telemetryStore.append({
        id: 'evt_2',
        runId,
        ts: new Date().toISOString(),
        type: 'step_started',
        payload: { stepId: 'build' },
      });

      const logs = observability.logs({ runId });

      expect(logs).toContain(runId);
      expect(logs).toContain('run_started');
      expect(logs).toContain('step_started');
      expect(logs).toContain('Total Events: 2');
    });

    it('should filter logs by event type', () => {
      telemetryStore.append({
        id: 'evt_1',
        runId,
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: {},
      });

      telemetryStore.append({
        id: 'evt_2',
        runId,
        ts: new Date().toISOString(),
        type: 'step_started',
        payload: {},
      });

      telemetryStore.append({
        id: 'evt_3',
        runId,
        ts: new Date().toISOString(),
        type: 'step_started',
        payload: {},
      });

      const logs = observability.logs({ runId, eventType: 'step_started' });

      expect(logs).toContain('step_started');
      expect(logs).not.toContain('run_started');
      expect(logs).toContain('Total Events: 2');
    });

    it('should limit number of logs returned', () => {
      for (let i = 0; i < 10; i++) {
        telemetryStore.append({
          id: `evt_${i}`,
          runId,
          ts: new Date().toISOString(),
          type: 'step_started',
          payload: {},
        });
      }

      const logs = observability.logs({ runId, limit: 5 });

      const lines = logs.split('\n');
      // Should have header + 5 events (each event has multiple lines)
      expect(lines.length).toBeGreaterThan(5);
      expect(lines.length).toBeLessThan(50); // Not all 10 events
    });

    it('should return message for non-existent run', () => {
      const logs = observability.logs({ runId: 'non_existent_run' });

      expect(logs).toContain('No logs found');
    });
  });

  describe('report', () => {
    it('should generate report for completed run', () => {
      telemetryStore.saveState(runId, {
        runId,
        workflowName: 'completed-workflow',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: {
          step1: { stepId: 'step1', status: 'completed', attempts: 1 },
          step2: { stepId: 'step2', status: 'completed', attempts: 1 },
        },
        budgets: {
          tokensUsed: 100000,
          costIncurred: 5.0,
          wallClockStartMs: Date.now() - 300000,
          retriesUsed: 1,
        },
      });

      telemetryStore.append({
        id: 'evt_start',
        runId,
        ts: new Date(Date.now() - 300000).toISOString(),
        type: 'run_started',
        payload: {},
      });

      telemetryStore.append({
        id: 'evt_end',
        runId,
        ts: new Date().toISOString(),
        type: 'run_completed',
        payload: {},
      });

      const report = observability.report({ runId });

      expect(report.runId).toBe(runId);
      expect(report.workflowName).toBe('completed-workflow');
      expect(report.status).toBe('completed');
      expect(report.tokensUsed).toBe(100000);
      expect(report.costIncurred).toBe(5.0);
      expect(report.stepsCompleted).toBe(2);
      expect(report.stepsFailed).toBe(0);
      expect(report.retriesUsed).toBe(1);
    });

    it('should count failed steps correctly', () => {
      telemetryStore.saveState(runId, {
        runId,
        workflowName: 'failed-workflow',
        status: 'failed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: {
          step1: { stepId: 'step1', status: 'completed', attempts: 1 },
          step2: { stepId: 'step2', status: 'failed', attempts: 3 },
        },
        budgets: {
          tokensUsed: 50000,
          costIncurred: 2.5,
          wallClockStartMs: Date.now(),
          retriesUsed: 2,
        },
      });

      const report = observability.report({ runId });

      expect(report.stepsCompleted).toBe(1);
      expect(report.stepsFailed).toBe(1);
    });

    it('should include artifacts in report', () => {
      telemetryStore.saveState(runId, {
        runId,
        workflowName: 'artifact-workflow',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: {},
        budgets: {
          tokensUsed: 0,
          costIncurred: 0,
          wallClockStartMs: Date.now(),
          retriesUsed: 0,
        },
      });

      telemetryStore.append({
        id: 'evt_artifact1',
        runId,
        ts: new Date().toISOString(),
        type: 'artifact_created',
        payload: { artifactUrl: 'https://github.com/user/repo/pull/123' },
      });

      telemetryStore.append({
        id: 'evt_artifact2',
        runId,
        ts: new Date().toISOString(),
        type: 'artifact_created',
        payload: { artifactUrl: 'https://github.com/user/repo/pull/124' },
      });

      const report = observability.report({ runId });

      expect(report.artifacts).toHaveLength(2);
      expect(report.artifacts).toContain('https://github.com/user/repo/pull/123');
      expect(report.artifacts).toContain('https://github.com/user/repo/pull/124');
    });

    it('should throw error for non-existent run', () => {
      expect(() => observability.report({ runId: 'non_existent_run' })).toThrow('Run not found');
    });
  });

  describe('formatReport', () => {
    it('should format report with all fields', () => {
      const report = {
        runId: 'run_123',
        workflowName: 'test-workflow',
        status: 'completed' as const,
        duration: 300000,
        tokensUsed: 100000,
        costIncurred: 5.0,
        stepsCompleted: 3,
        stepsFailed: 0,
        retriesUsed: 1,
        artifacts: ['https://github.com/user/repo/pull/123'],
      };

      const formatted = observability.formatReport(report);

      expect(formatted).toContain('run_123');
      expect(formatted).toContain('test-workflow');
      expect(formatted).toContain('completed');
      expect(formatted).toContain('100,000');
      expect(formatted).toContain('5.00');
      expect(formatted).toContain('3');
      expect(formatted).toContain('1');
      expect(formatted).toContain('https://github.com/user/repo/pull/123');
    });

    it('should format duration correctly', () => {
      const report = {
        runId: 'run_123',
        workflowName: 'test',
        status: 'completed' as const,
        duration: 3723000,
        tokensUsed: 0,
        costIncurred: 0,
        stepsCompleted: 0,
        stepsFailed: 0,
        retriesUsed: 0,
        artifacts: [],
      };

      const formatted = observability.formatReport(report);

      expect(formatted).toContain('1h 2m 3s');
    });
  });

  describe('listRuns', () => {
    it('should list all runs for user', () => {
      const run1 = 'run_001';
      const run2 = 'run_002';

      telemetryStore.saveState(run1, {
        runId: run1,
        workflowName: 'workflow-1',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: {},
        budgets: {
          tokensUsed: 0,
          costIncurred: 0,
          wallClockStartMs: Date.now(),
          retriesUsed: 0,
        },
      });

      telemetryStore.saveState(run2, {
        runId: run2,
        workflowName: 'workflow-2',
        status: 'running',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: {},
        budgets: {
          tokensUsed: 0,
          costIncurred: 0,
          wallClockStartMs: Date.now(),
          retriesUsed: 0,
        },
      });

      const runs = observability.listRuns();

      expect(runs).toContain(run1);
      expect(runs).toContain(run2);
    });
  });
});
