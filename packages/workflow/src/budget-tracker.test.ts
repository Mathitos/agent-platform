import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BudgetTracker } from './budget-tracker';
import { TelemetryStore } from './telemetry-store';
import { WorkflowBudgets, BudgetState } from './types';

describe('BudgetTracker', () => {
  const testStorePath = path.join('/tmp', 'loom-test-budget', Math.random().toString(36).substr(2, 9));
  let telemetryStore: TelemetryStore;
  let runId: string;

  beforeEach(() => {
    telemetryStore = new TelemetryStore({ userId: 'test-user', storePath: testStorePath });
    runId = TelemetryStore.generateRunId();
  });

  afterEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.rmSync(testStorePath, { recursive: true });
    }
  });

  describe('token budget', () => {
    it('should track tokens used', () => {
      const budgets: WorkflowBudgets = { tokens: 100000 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addTokens(10000);
      tracker.addTokens(5000);

      const state = tracker.getState();
      expect(state.tokensUsed).toBe(15000);
    });

    it('should not exceed budget initially', () => {
      const budgets: WorkflowBudgets = { tokens: 100000 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addTokens(50000);

      const result = tracker.check();
      expect(result.exceeded).toBe(false);
    });

    it('should detect token budget exceeded', () => {
      const budgets: WorkflowBudgets = { tokens: 100000 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addTokens(150000);

      const result = tracker.check();
      expect(result.exceeded).toBe(true);
      expect(result.budgetType).toBe('tokens');
    });

    it('should emit warning when approaching token budget', () => {
      const budgets: WorkflowBudgets = { tokens: 100000 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addTokens(85000);

      const result = tracker.check();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe('tokens');
      expect(result.warnings[0].percentUsed).toBeGreaterThanOrEqual(0.8);
    });

    it('should emit event when token budget exceeded', () => {
      const budgets: WorkflowBudgets = { tokens: 100000 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addTokens(150000);
      tracker.check();

      const events = telemetryStore.listByRun(runId, { eventType: 'budget_exceeded' });
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].payload.budgetType).toBe('tokens');
    });
  });

  describe('cost budget', () => {
    it('should track cost incurred', () => {
      const budgets: WorkflowBudgets = { cost: 50.0 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addCost(10.5);
      tracker.addCost(5.25);

      const state = tracker.getState();
      expect(state.costIncurred).toBeCloseTo(15.75, 2);
    });

    it('should detect cost budget exceeded', () => {
      const budgets: WorkflowBudgets = { cost: 50.0 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addCost(75.0);

      const result = tracker.check();
      expect(result.exceeded).toBe(true);
      expect(result.budgetType).toBe('cost');
    });

    it('should emit warning when approaching cost budget', () => {
      const budgets: WorkflowBudgets = { cost: 50.0 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addCost(42.0);

      const result = tracker.check();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe('cost');
    });
  });

  describe('wall clock budget', () => {
    it('should track elapsed time', async () => {
      const budgets: WorkflowBudgets = { wallClockMs: 10000 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      await new Promise(resolve => setTimeout(resolve, 100));

      const elapsed = tracker.getElapsedMs();
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should detect wall clock budget exceeded', () => {
      const budgets: WorkflowBudgets = { wallClockMs: 100 };
      const pastStartTime = Date.now() - 200;

      const initialState: BudgetState = {
        tokensUsed: 0,
        costIncurred: 0,
        wallClockStartMs: pastStartTime,
        retriesUsed: 0,
      };

      const tracker = new BudgetTracker(budgets, runId, telemetryStore, initialState);

      const result = tracker.check();
      expect(result.exceeded).toBe(true);
      expect(result.budgetType).toBe('wallClock');
    });

    it('should emit warning when approaching wall clock budget', () => {
      const budgets: WorkflowBudgets = { wallClockMs: 1000 };
      const pastStartTime = Date.now() - 850;

      const initialState: BudgetState = {
        tokensUsed: 0,
        costIncurred: 0,
        wallClockStartMs: pastStartTime,
        retriesUsed: 0,
      };

      const tracker = new BudgetTracker(budgets, runId, telemetryStore, initialState);

      const result = tracker.check();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe('wallClock');
    });
  });

  describe('retries budget', () => {
    it('should track retries used', () => {
      const budgets: WorkflowBudgets = { retries: 3 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.incrementRetries();
      tracker.incrementRetries();

      const state = tracker.getState();
      expect(state.retriesUsed).toBe(2);
    });

    it('should detect retries budget exceeded', () => {
      const budgets: WorkflowBudgets = { retries: 2 };
      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.incrementRetries();
      tracker.incrementRetries();
      tracker.incrementRetries();

      const result = tracker.check();
      expect(result.exceeded).toBe(true);
      expect(result.budgetType).toBe('retries');
    });
  });

  describe('multiple budgets', () => {
    it('should check all budgets', () => {
      const budgets: WorkflowBudgets = {
        tokens: 100000,
        cost: 50.0,
        wallClockMs: 10000,
        retries: 2,
      };

      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addTokens(50000);
      tracker.addCost(25.0);
      tracker.incrementRetries();

      const result = tracker.check();
      expect(result.exceeded).toBe(false);
    });

    it('should report first exceeded budget', () => {
      const budgets: WorkflowBudgets = {
        tokens: 100000,
        cost: 50.0,
      };

      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addTokens(150000);
      tracker.addCost(75.0);

      const result = tracker.check();
      expect(result.exceeded).toBe(true);
      expect(result.budgetType).toBe('tokens');
    });

    it('should emit multiple warnings', () => {
      const budgets: WorkflowBudgets = {
        tokens: 100000,
        cost: 50.0,
      };

      const tracker = new BudgetTracker(budgets, runId, telemetryStore);

      tracker.addTokens(85000);
      tracker.addCost(42.0);

      const result = tracker.check();
      expect(result.warnings.length).toBe(2);

      const warningTypes = result.warnings.map(w => w.type);
      expect(warningTypes).toContain('tokens');
      expect(warningTypes).toContain('cost');
    });
  });

  describe('state persistence', () => {
    it('should initialize with provided state', () => {
      const budgets: WorkflowBudgets = { tokens: 100000 };
      const initialState: BudgetState = {
        tokensUsed: 25000,
        costIncurred: 10.0,
        wallClockStartMs: Date.now() - 5000,
        retriesUsed: 1,
      };

      const tracker = new BudgetTracker(budgets, runId, telemetryStore, initialState);

      const state = tracker.getState();
      expect(state.tokensUsed).toBe(25000);
      expect(state.costIncurred).toBe(10.0);
      expect(state.retriesUsed).toBe(1);
    });

    it('should support resume scenario', () => {
      const budgets: WorkflowBudgets = { tokens: 100000 };

      const tracker1 = new BudgetTracker(budgets, runId, telemetryStore);
      tracker1.addTokens(30000);

      const state1 = tracker1.getState();

      const tracker2 = new BudgetTracker(budgets, runId, telemetryStore, state1);
      tracker2.addTokens(20000);

      const state2 = tracker2.getState();
      expect(state2.tokensUsed).toBe(50000);
    });
  });

  describe('static estimation methods', () => {
    it('should estimate tokens for common actions', () => {
      const actions = [
        'implement_feature',
        'review_changes',
        'gate_merge',
        'implement_and_open_pr',
        'review_diff_and_tests',
      ];

      for (const action of actions) {
        const estimate = BudgetTracker.estimateTokensForAction(action);
        expect(estimate).toBeGreaterThan(0);
      }
    });

    it('should provide default estimate for unknown actions', () => {
      const estimate = BudgetTracker.estimateTokensForAction('unknown_action');
      expect(estimate).toBe(30000);
    });

    it('should estimate cost for tokens and models', () => {
      const models = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo', 'qwen'];

      for (const model of models) {
        const cost = BudgetTracker.estimateCostForTokens(100000, model);
        expect(cost).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return zero cost for free models', () => {
      const cost = BudgetTracker.estimateCostForTokens(100000, 'qwen');
      expect(cost).toBe(0);
    });

    it('should provide default cost for unknown models', () => {
      const cost = BudgetTracker.estimateCostForTokens(1000000, 'unknown-model');
      expect(cost).toBe(5.0);
    });
  });
});
