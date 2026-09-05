import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TelemetryStore } from './telemetry-store';
import { TelemetryEvent } from './types';

describe('TelemetryStore', () => {
  const testStorePath = path.join('/tmp', 'loom-test-telemetry', Math.random().toString(36).substr(2, 9));
  let store: TelemetryStore;

  beforeEach(() => {
    store = new TelemetryStore({ userId: 'test-user', storePath: testStorePath });
  });

  afterEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.rmSync(testStorePath, { recursive: true });
    }
  });

  describe('append', () => {
    it('should append event to run log', () => {
      const runId = 'run_test_123';
      const event: TelemetryEvent = {
        id: 'evt_1',
        runId,
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: { workflowName: 'test' },
      };

      store.append(event);

      const events = store.listByRun(runId);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('evt_1');
      expect(events[0].type).toBe('run_started');
    });

    it('should append multiple events in order', () => {
      const runId = 'run_test_456';

      for (let i = 0; i < 5; i++) {
        const event: TelemetryEvent = {
          id: `evt_${i}`,
          runId,
          ts: new Date().toISOString(),
          type: 'step_started',
          payload: { stepId: `step${i}` },
        };
        store.append(event);
      }

      const events = store.listByRun(runId);
      expect(events).toHaveLength(5);

      for (let i = 0; i < 5; i++) {
        expect(events[i].id).toBe(`evt_${i}`);
      }
    });

    it('should create log file on first append', () => {
      const runId = 'run_create_test';
      const event: TelemetryEvent = {
        id: 'evt_1',
        runId,
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: {},
      };

      store.append(event);

      const logPath = path.join(testStorePath, `${runId}.jsonl`);
      expect(fs.existsSync(logPath)).toBe(true);
    });
  });

  describe('listByRun', () => {
    it('should return empty array for non-existent run', () => {
      const events = store.listByRun('non_existent_run');
      expect(events).toHaveLength(0);
    });

    it('should filter events by type', () => {
      const runId = 'run_filter_test';

      store.append({
        id: 'evt_1',
        runId,
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: {},
      });

      store.append({
        id: 'evt_2',
        runId,
        ts: new Date().toISOString(),
        type: 'step_started',
        payload: {},
      });

      store.append({
        id: 'evt_3',
        runId,
        ts: new Date().toISOString(),
        type: 'step_started',
        payload: {},
      });

      const allEvents = store.listByRun(runId);
      expect(allEvents).toHaveLength(3);

      const stepEvents = store.listByRun(runId, { eventType: 'step_started' });
      expect(stepEvents).toHaveLength(2);
      expect(stepEvents.every(e => e.type === 'step_started')).toBe(true);
    });

    it('should limit number of events returned', () => {
      const runId = 'run_limit_test';

      for (let i = 0; i < 10; i++) {
        store.append({
          id: `evt_${i}`,
          runId,
          ts: new Date().toISOString(),
          type: 'step_started',
          payload: {},
        });
      }

      const events = store.listByRun(runId, { limit: 5 });
      expect(events).toHaveLength(5);
    });
  });

  describe('saveState and loadState', () => {
    it('should save and load run state', () => {
      const runId = 'run_state_test';
      const state = {
        runId,
        status: 'running',
        currentStep: 'step1',
        tokensUsed: 1000,
      };

      store.saveState(runId, state);

      const loaded = store.loadState(runId);
      expect(loaded).toEqual(state);
    });

    it('should return null for non-existent state', () => {
      const loaded = store.loadState('non_existent_run');
      expect(loaded).toBeNull();
    });

    it('should overwrite existing state', () => {
      const runId = 'run_overwrite_test';

      store.saveState(runId, { status: 'running' });
      store.saveState(runId, { status: 'completed' });

      const loaded = store.loadState(runId);
      expect(loaded).toEqual({ status: 'completed' });
    });
  });

  describe('listRuns', () => {
    it('should return empty array when no runs exist', () => {
      const runs = store.listRuns();
      expect(runs).toHaveLength(0);
    });

    it('should list all runs with logs', () => {
      store.append({
        id: 'evt_1',
        runId: 'run_1',
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: {},
      });

      store.append({
        id: 'evt_2',
        runId: 'run_2',
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: {},
      });

      const runs = store.listRuns();
      expect(runs).toHaveLength(2);
      expect(runs).toContain('run_1');
      expect(runs).toContain('run_2');
    });

    it('should list all runs with state files', () => {
      store.saveState('run_3', { status: 'running' });
      store.saveState('run_4', { status: 'completed' });

      const runs = store.listRuns();
      expect(runs).toContain('run_3');
      expect(runs).toContain('run_4');
    });

    it('should not duplicate runs with both logs and state', () => {
      const runId = 'run_both';

      store.append({
        id: 'evt_1',
        runId,
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: {},
      });

      store.saveState(runId, { status: 'running' });

      const runs = store.listRuns();
      const count = runs.filter(r => r === runId).length;
      expect(count).toBe(1);
    });
  });

  describe('deleteRun', () => {
    it('should delete log file', () => {
      const runId = 'run_delete_log';

      store.append({
        id: 'evt_1',
        runId,
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: {},
      });

      const logPath = path.join(testStorePath, `${runId}.jsonl`);
      expect(fs.existsSync(logPath)).toBe(true);

      store.deleteRun(runId);
      expect(fs.existsSync(logPath)).toBe(false);
    });

    it('should delete state file', () => {
      const runId = 'run_delete_state';

      store.saveState(runId, { status: 'running' });

      const statePath = path.join(testStorePath, `${runId}.state.json`);
      expect(fs.existsSync(statePath)).toBe(true);

      store.deleteRun(runId);
      expect(fs.existsSync(statePath)).toBe(false);
    });

    it('should delete both log and state files', () => {
      const runId = 'run_delete_both';

      store.append({
        id: 'evt_1',
        runId,
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: {},
      });

      store.saveState(runId, { status: 'running' });

      store.deleteRun(runId);

      expect(store.listByRun(runId)).toHaveLength(0);
      expect(store.loadState(runId)).toBeNull();
    });

    it('should not error when deleting non-existent run', () => {
      expect(() => store.deleteRun('non_existent_run')).not.toThrow();
    });
  });

  describe('static helper methods', () => {
    it('should generate unique event IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const id = TelemetryStore.generateEventId();
        expect(id).toMatch(/^evt_\d+_[a-z0-9]+$/);
        ids.add(id);
      }

      expect(ids.size).toBe(100);
    });

    it('should generate unique run IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const id = TelemetryStore.generateRunId();
        expect(id).toMatch(/^run_\d+_[a-z0-9]+$/);
        ids.add(id);
      }

      expect(ids.size).toBe(100);
    });
  });

  describe('user namespacing', () => {
    it('should isolate data by user ID', () => {
      const user1Store = new TelemetryStore({
        userId: 'user1',
        storePath: path.join(testStorePath, 'isolated'),
      });

      const user2Store = new TelemetryStore({
        userId: 'user2',
        storePath: path.join(testStorePath, 'isolated2'),
      });

      const runId = 'run_shared_id';

      user1Store.append({
        id: 'evt_user1',
        runId,
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: { user: 'user1' },
      });

      user2Store.append({
        id: 'evt_user2',
        runId,
        ts: new Date().toISOString(),
        type: 'run_started',
        payload: { user: 'user2' },
      });

      const user1Events = user1Store.listByRun(runId);
      const user2Events = user2Store.listByRun(runId);

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(1);
      expect(user1Events[0].payload.user).toBe('user1');
      expect(user2Events[0].payload.user).toBe('user2');

      fs.rmSync(path.join(testStorePath, 'isolated'), { recursive: true });
      fs.rmSync(path.join(testStorePath, 'isolated2'), { recursive: true });
    });
  });
});
