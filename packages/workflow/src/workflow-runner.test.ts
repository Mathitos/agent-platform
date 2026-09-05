import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { WorkflowRunner } from './workflow-runner';
import { WorkflowDefinition } from './types';
import { TelemetryStore } from './telemetry-store';

vi.mock('@loom/core', () => ({
  Config: {
    createProvider: vi.fn(() => ({
      getName: () => 'mock-provider',
      chat: vi.fn(async () => ({
        content: 'Mock response',
        tool_calls: [],
      })),
    })),
  },
}));

vi.mock('@loom/agent', () => ({
  AgentExecutor: vi.fn(() => ({
    executeTurn: vi.fn(async () => ({
      messages: [],
      toolCalls: 2,
      iterations: 3,
    })),
  })),
}));

describe('WorkflowRunner', () => {
  const testStorePath = path.join('/tmp', 'loom-test-runner', Math.random().toString(36).substr(2, 9));

  beforeEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.rmSync(testStorePath, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.rmSync(testStorePath, { recursive: true });
    }
    vi.clearAllMocks();
  });

  describe('basic workflow execution', () => {
    it('should execute simple single-step workflow', async () => {
      const workflow: WorkflowDefinition = {
        name: 'simple-workflow',
        budgets: { tokens: 100000, retries: 1 },
        agents: [
          { id: 'builder', role: 'builder', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'build', agent: 'builder', needs: [], action: 'implement_feature' },
        ],
        onFailure: 'abort',
      };

      const runner = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      const state = await runner.run();

      expect(state.status).toBe('completed');
      expect(state.steps.get('build')?.status).toBe('completed');
    });

    it('should execute multi-step sequential workflow', async () => {
      const workflow: WorkflowDefinition = {
        name: 'sequential-workflow',
        budgets: { tokens: 200000, retries: 1 },
        agents: [
          { id: 'builder', role: 'builder', provider: 'mock', model: 'mock-model' },
          { id: 'reviewer', role: 'reviewer', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'build', agent: 'builder', needs: [], action: 'implement_feature' },
          { id: 'review', agent: 'reviewer', needs: ['build'], action: 'review_changes' },
        ],
        onFailure: 'abort',
      };

      const runner = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      const state = await runner.run();

      expect(state.status).toBe('completed');
      expect(state.steps.get('build')?.status).toBe('completed');
      expect(state.steps.get('review')?.status).toBe('completed');
    });

    it('should emit telemetry events during execution', async () => {
      const workflow: WorkflowDefinition = {
        name: 'telemetry-workflow',
        budgets: { tokens: 100000, retries: 1 },
        agents: [
          { id: 'builder', role: 'builder', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'build', agent: 'builder', needs: [], action: 'implement_feature' },
        ],
        onFailure: 'abort',
      };

      const runner = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      const state = await runner.run();

      const store = new TelemetryStore({ userId: 'test-user' });
      const events = store.listByRun(state.runId);

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'run_started')).toBe(true);
      expect(events.some(e => e.type === 'step_started')).toBe(true);
      expect(events.some(e => e.type === 'step_completed')).toBe(true);
      expect(events.some(e => e.type === 'run_completed')).toBe(true);
    });
  });

  describe('parallel step execution', () => {
    it('should execute parallel steps concurrently', async () => {
      const workflow: WorkflowDefinition = {
        name: 'parallel-workflow',
        budgets: { tokens: 200000, retries: 1 },
        agents: [
          { id: 'agent1', role: 'specialist', provider: 'mock', model: 'mock-model' },
          { id: 'agent2', role: 'specialist', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'step1', agent: 'agent1', needs: [], action: 'task1', parallel: true },
          { id: 'step2', agent: 'agent2', needs: [], action: 'task2', parallel: true },
        ],
        onFailure: 'abort',
      };

      const runner = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      const state = await runner.run();

      expect(state.status).toBe('completed');
      expect(state.steps.get('step1')?.status).toBe('completed');
      expect(state.steps.get('step2')?.status).toBe('completed');
    });
  });

  describe('retry logic', () => {
    it('should retry failed steps when onFailure is retry', async () => {
      let attemptCount = 0;

      const { AgentExecutor } = await import('@loom/agent');
      (AgentExecutor as any).mockImplementation(() => ({
        executeTurn: vi.fn(async () => {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error('Simulated failure');
          }
          return { messages: [], toolCalls: 1, iterations: 1 };
        }),
      }));

      const workflow: WorkflowDefinition = {
        name: 'retry-workflow',
        budgets: { tokens: 200000, retries: 2 },
        agents: [
          { id: 'builder', role: 'builder', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'build', agent: 'builder', needs: [], action: 'implement_feature' },
        ],
        onFailure: 'retry',
      };

      const runner = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      const state = await runner.run();

      expect(state.status).toBe('completed');
      expect(state.steps.get('build')?.attempts).toBeGreaterThan(1);
      expect(attemptCount).toBe(2);
    });

    it('should emit retry events', async () => {
      let attemptCount = 0;

      const { AgentExecutor } = await import('@loom/agent');
      (AgentExecutor as any).mockImplementation(() => ({
        executeTurn: vi.fn(async () => {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error('Simulated failure');
          }
          return { messages: [], toolCalls: 1, iterations: 1 };
        }),
      }));

      const workflow: WorkflowDefinition = {
        name: 'retry-events-workflow',
        budgets: { tokens: 200000, retries: 2 },
        agents: [
          { id: 'builder', role: 'builder', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'build', agent: 'builder', needs: [], action: 'implement_feature' },
        ],
        onFailure: 'retry',
      };

      const runner = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      const state = await runner.run();

      const store = new TelemetryStore({ userId: 'test-user' });
      const events = store.listByRun(state.runId);

      expect(events.some(e => e.type === 'step_failed')).toBe(true);
      expect(events.some(e => e.type === 'step_retrying')).toBe(true);
    });
  });

  describe('pause and resume', () => {
    it('should pause workflow on failure when onFailure is pauseHuman', async () => {
      const { AgentExecutor } = await import('@loom/agent');
      (AgentExecutor as any).mockImplementation(() => ({
        executeTurn: vi.fn(async () => {
          throw new Error('Simulated failure for pause');
        }),
      }));

      const workflow: WorkflowDefinition = {
        name: 'pause-workflow',
        budgets: { tokens: 200000, retries: 0 },
        agents: [
          { id: 'builder', role: 'builder', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'build', agent: 'builder', needs: [], action: 'implement_feature' },
        ],
        onFailure: 'pauseHuman',
      };

      const runner = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      await expect(runner.run()).rejects.toThrow('Workflow paused for human intervention');

      const state = runner.getState();
      expect(state.status).toBe('paused');
      expect(state.pauseReason).toBeTruthy();
    });

    it('should resume paused workflow', async () => {
      const { AgentExecutor } = await import('@loom/agent');

      let failureCount = 0;
      (AgentExecutor as any).mockImplementation(() => ({
        executeTurn: vi.fn(async () => {
          failureCount++;
          if (failureCount === 1) {
            throw new Error('First attempt fails');
          }
          return { messages: [], toolCalls: 1, iterations: 1 };
        }),
      }));

      const workflow: WorkflowDefinition = {
        name: 'resume-workflow',
        budgets: { tokens: 200000, retries: 0 },
        agents: [
          { id: 'builder', role: 'builder', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'build', agent: 'builder', needs: [], action: 'implement_feature' },
        ],
        onFailure: 'pauseHuman',
      };

      const runner1 = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      await expect(runner1.run()).rejects.toThrow();
      const runId = runner1.getRunId();

      const store = new TelemetryStore({ userId: 'test-user' });
      const state = store.loadState(runId);
      expect(state?.status).toBe('paused');

      (state as any).steps.build.status = 'pending';
      store.saveState(runId, state!);

      const runner2 = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
        resumeRunId: runId,
      });

      const finalState = await runner2.run();
      expect(finalState.status).toBe('completed');
    });

    it('should emit pause and resume events', async () => {
      const { AgentExecutor } = await import('@loom/agent');

      let failureCount = 0;
      (AgentExecutor as any).mockImplementation(() => ({
        executeTurn: vi.fn(async () => {
          failureCount++;
          if (failureCount === 1) {
            throw new Error('First attempt fails');
          }
          return { messages: [], toolCalls: 1, iterations: 1 };
        }),
      }));

      const workflow: WorkflowDefinition = {
        name: 'pause-resume-events',
        budgets: { tokens: 200000, retries: 0 },
        agents: [
          { id: 'builder', role: 'builder', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'build', agent: 'builder', needs: [], action: 'implement_feature' },
        ],
        onFailure: 'pauseHuman',
      };

      const runner1 = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      await expect(runner1.run()).rejects.toThrow();
      const runId = runner1.getRunId();

      const store = new TelemetryStore({ userId: 'test-user' });
      const events = store.listByRun(runId);

      expect(events.some(e => e.type === 'run_paused')).toBe(true);
    });
  });

  describe('budget enforcement', () => {
    it('should fail when token budget exceeded', async () => {
      const workflow: WorkflowDefinition = {
        name: 'budget-workflow',
        budgets: { tokens: 1000, retries: 1 },
        agents: [
          { id: 'builder', role: 'builder', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'build', agent: 'builder', needs: [], action: 'implement_feature' },
        ],
        onFailure: 'abort',
      };

      const runner = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      const state = await runner.run();

      expect(state.status).toBe('failed');

      const store = new TelemetryStore({ userId: 'test-user' });
      const events = store.listByRun(state.runId);

      expect(events.some(e => e.type === 'budget_exceeded')).toBe(true);
    });
  });

  describe('supervisor merge', () => {
    it('should not attempt merge when allowSupervisorMerge is false', async () => {
      const workflow: WorkflowDefinition = {
        name: 'no-merge-workflow',
        budgets: { tokens: 200000, retries: 1 },
        agents: [
          { id: 'supervisor', role: 'supervisor', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'supervise', agent: 'supervisor', needs: [], action: 'gate_merge' },
        ],
        onFailure: 'abort',
        allowSupervisorMerge: false,
      };

      const runner = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      const state = await runner.run();

      const store = new TelemetryStore({ userId: 'test-user' });
      const events = store.listByRun(state.runId);

      expect(events.some(e => e.type === 'merge_attempted')).toBe(false);
    });

    it('should attempt merge when allowSupervisorMerge is true', async () => {
      const workflow: WorkflowDefinition = {
        name: 'merge-workflow',
        budgets: { tokens: 200000, retries: 1 },
        agents: [
          { id: 'supervisor', role: 'supervisor', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'supervise', agent: 'supervisor', needs: [], action: 'gate_merge' },
        ],
        onFailure: 'abort',
        allowSupervisorMerge: true,
      };

      const runner = new WorkflowRunner(workflow, {
        workflowFile: 'test.json',
        workspaceRoot: '/tmp',
        userId: 'test-user',
      });

      const state = await runner.run();

      const store = new TelemetryStore({ userId: 'test-user' });
      const events = store.listByRun(state.runId);

      expect(events.some(e => e.type === 'merge_attempted')).toBe(true);
      expect(events.some(e => e.type === 'merge_completed')).toBe(true);
    });
  });

  describe('workflow file loading', () => {
    it('should load workflow from JSON file', async () => {
      const workflowPath = path.join(testStorePath, 'test-workflow.json');

      const workflow: WorkflowDefinition = {
        name: 'file-workflow',
        budgets: { tokens: 100000, retries: 1 },
        agents: [
          { id: 'builder', role: 'builder', provider: 'mock', model: 'mock-model' },
        ],
        steps: [
          { id: 'build', agent: 'builder', needs: [], action: 'implement_feature' },
        ],
        onFailure: 'abort',
      };

      fs.mkdirSync(testStorePath, { recursive: true });
      fs.writeFileSync(workflowPath, JSON.stringify(workflow), 'utf8');

      const loaded = await WorkflowRunner.loadWorkflowFile(workflowPath);

      expect(loaded.name).toBe('file-workflow');
      expect(loaded.agents).toHaveLength(1);
      expect(loaded.steps).toHaveLength(1);
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        WorkflowRunner.loadWorkflowFile('/non/existent/file.json')
      ).rejects.toThrow('Workflow file not found');
    });

    it('should throw error for unsupported file format', async () => {
      const workflowPath = path.join(testStorePath, 'test.txt');

      fs.mkdirSync(testStorePath, { recursive: true });
      fs.writeFileSync(workflowPath, 'not a workflow', 'utf8');

      await expect(WorkflowRunner.loadWorkflowFile(workflowPath)).rejects.toThrow(
        'Unsupported workflow file format'
      );
    });
  });
});
