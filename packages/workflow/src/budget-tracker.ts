import { WorkflowBudgets, BudgetState, TelemetryEvent } from './types';
import { TelemetryStore } from './telemetry-store';

export type BudgetWarningType = 'tokens' | 'cost' | 'wallClock' | 'retries';

export interface BudgetWarning {
  type: BudgetWarningType;
  current: number;
  limit: number;
  percentUsed: number;
}

export interface BudgetCheckResult {
  exceeded: boolean;
  warnings: BudgetWarning[];
  budgetType?: BudgetWarningType;
}

export class BudgetTracker {
  private budgets: WorkflowBudgets;
  private state: BudgetState;
  private runId: string;
  private telemetryStore: TelemetryStore;
  private warningThreshold: number = 0.8;

  constructor(
    budgets: WorkflowBudgets,
    runId: string,
    telemetryStore: TelemetryStore,
    initialState?: BudgetState
  ) {
    this.budgets = budgets;
    this.runId = runId;
    this.telemetryStore = telemetryStore;

    if (initialState) {
      this.state = initialState;
    } else {
      this.state = {
        tokensUsed: 0,
        costIncurred: 0,
        wallClockStartMs: Date.now(),
        retriesUsed: 0,
      };
    }
  }

  addTokens(tokens: number): void {
    this.state.tokensUsed += tokens;
  }

  addCost(cost: number): void {
    this.state.costIncurred += cost;
  }

  incrementRetries(): void {
    this.state.retriesUsed += 1;
  }

  getState(): BudgetState {
    return { ...this.state };
  }

  getElapsedMs(): number {
    return Date.now() - this.state.wallClockStartMs;
  }

  check(): BudgetCheckResult {
    const warnings: BudgetWarning[] = [];
    let exceeded = false;
    let budgetType: BudgetWarningType | undefined;

    if (this.budgets.tokens !== undefined) {
      const percentUsed = this.state.tokensUsed / this.budgets.tokens;

      if (this.state.tokensUsed > this.budgets.tokens) {
        exceeded = true;
        budgetType = 'tokens';

        this.emitEvent('budget_exceeded', {
          budgetType: 'tokens',
          limit: this.budgets.tokens,
          current: this.state.tokensUsed,
        });
      } else if (percentUsed >= this.warningThreshold) {
        warnings.push({
          type: 'tokens',
          current: this.state.tokensUsed,
          limit: this.budgets.tokens,
          percentUsed,
        });

        this.emitEvent('budget_warning', {
          budgetType: 'tokens',
          limit: this.budgets.tokens,
          current: this.state.tokensUsed,
          percentUsed,
        });
      }
    }

    if (this.budgets.cost !== undefined) {
      const percentUsed = this.state.costIncurred / this.budgets.cost;

      if (this.state.costIncurred > this.budgets.cost) {
        exceeded = true;
        budgetType = budgetType || 'cost';

        this.emitEvent('budget_exceeded', {
          budgetType: 'cost',
          limit: this.budgets.cost,
          current: this.state.costIncurred,
        });
      } else if (percentUsed >= this.warningThreshold) {
        warnings.push({
          type: 'cost',
          current: this.state.costIncurred,
          limit: this.budgets.cost,
          percentUsed,
        });

        this.emitEvent('budget_warning', {
          budgetType: 'cost',
          limit: this.budgets.cost,
          current: this.state.costIncurred,
          percentUsed,
        });
      }
    }

    if (this.budgets.wallClockMs !== undefined) {
      const elapsed = this.getElapsedMs();
      const percentUsed = elapsed / this.budgets.wallClockMs;

      if (elapsed > this.budgets.wallClockMs) {
        exceeded = true;
        budgetType = budgetType || 'wallClock';

        this.emitEvent('budget_exceeded', {
          budgetType: 'wallClock',
          limit: this.budgets.wallClockMs,
          current: elapsed,
        });
      } else if (percentUsed >= this.warningThreshold) {
        warnings.push({
          type: 'wallClock',
          current: elapsed,
          limit: this.budgets.wallClockMs,
          percentUsed,
        });

        this.emitEvent('budget_warning', {
          budgetType: 'wallClock',
          limit: this.budgets.wallClockMs,
          current: elapsed,
          percentUsed,
        });
      }
    }

    if (this.budgets.retries !== undefined) {
      if (this.state.retriesUsed > this.budgets.retries) {
        exceeded = true;
        budgetType = budgetType || 'retries';

        this.emitEvent('budget_exceeded', {
          budgetType: 'retries',
          limit: this.budgets.retries,
          current: this.state.retriesUsed,
        });
      }
    }

    return { exceeded, warnings, budgetType };
  }

  private emitEvent(type: 'budget_warning' | 'budget_exceeded', payload: Record<string, unknown>): void {
    const event: TelemetryEvent = {
      id: TelemetryStore.generateEventId(),
      runId: this.runId,
      ts: new Date().toISOString(),
      type,
      payload,
    };

    this.telemetryStore.append(event);
  }

  static estimateTokensForAction(action: string): number {
    const estimates: Record<string, number> = {
      implement_feature: 50000,
      review_changes: 20000,
      gate_merge: 10000,
      implement_and_open_pr: 50000,
      review_diff_and_tests: 20000,
    };

    return estimates[action] || 30000;
  }

  static estimateCostForTokens(tokens: number, model: string): number {
    const pricePerMillionTokens: Record<string, number> = {
      'gpt-4': 30.0,
      'gpt-3.5-turbo': 2.0,
      'gpt-4-turbo': 10.0,
      'claude-3-opus': 15.0,
      'claude-3-sonnet': 3.0,
      qwen: 0.0,
      bionic: 0.0,
      'local-model': 0.0,
    };

    // Check exact match first, then lowercase, then default
    let price: number;
    if (model in pricePerMillionTokens) {
      price = pricePerMillionTokens[model];
    } else if (model.toLowerCase() in pricePerMillionTokens) {
      price = pricePerMillionTokens[model.toLowerCase()];
    } else {
      price = 5.0;
    }
    
    // Return 0 for free models
    if (price === 0.0) {
      return 0.0;
    }
    
    return (tokens / 1000000) * price;
  }
}
