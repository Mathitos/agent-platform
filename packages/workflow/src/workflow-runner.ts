import * as fs from 'fs';
import * as path from 'path';
import { ProviderAdapter } from '@loom/core';
import { OpenAIProvider, OpenAICompatibleProvider } from '@loom/providers';
import { AgentExecutor } from '@loom/agent';
import {
  WorkflowDefinition,
  WorkflowRunOptions,
  RunState,
  RunStatus,
  StepState,
  StepStatus,
  TelemetryEvent,
  WorkflowStep,
} from './types';
import { TelemetryStore } from './telemetry-store';
import { BudgetTracker } from './budget-tracker';
import { MockProvider } from './mock-provider';
import { WorkflowNotifier } from './notifier';

export class WorkflowRunner {
  private workflow: WorkflowDefinition;
  private options: WorkflowRunOptions;
  private telemetryStore: TelemetryStore;
  private budgetTracker: BudgetTracker;
  private runState: RunState;
  private providers: Map<string, ProviderAdapter>;
  private agents: Map<string, AgentExecutor>;

  constructor(workflow: WorkflowDefinition, options: WorkflowRunOptions) {
    this.workflow = workflow;
    this.options = options;

    const userId = options.userId || 'default';
    this.telemetryStore = new TelemetryStore({ userId });

    this.providers = new Map();
    this.agents = new Map();

    if (options.resumeRunId) {
      this.runState = this.loadRunState(options.resumeRunId);
      this.budgetTracker = new BudgetTracker(
        workflow.budgets,
        options.resumeRunId,
        this.telemetryStore,
        this.runState.budgets
      );
    } else {
      const runId = TelemetryStore.generateRunId();
      this.budgetTracker = new BudgetTracker(workflow.budgets, runId, this.telemetryStore);
      this.runState = this.createInitialState(runId);
    }
  }

  private createInitialState(runId: string): RunState {
    const steps = new Map<string, StepState>();

    for (const step of this.workflow.steps) {
      steps.set(step.id, {
        stepId: step.id,
        status: 'pending',
        attempts: 0,
      });
    }

    return {
      runId,
      workflowName: this.workflow.name,
      status: 'initialized',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps,
      budgets: this.budgetTracker.getState(),
    };
  }

  private loadRunState(runId: string): RunState {
    const stateData = this.telemetryStore.loadState(runId);

    if (!stateData) {
      throw new Error(`Run state not found for runId: ${runId}`);
    }

    const steps = new Map<string, StepState>();
    if (stateData.steps && typeof stateData.steps === 'object') {
      for (const [stepId, stepState] of Object.entries(stateData.steps)) {
        steps.set(stepId, stepState as StepState);
      }
    }

    return {
      runId: stateData.runId as string,
      workflowName: stateData.workflowName as string,
      status: stateData.status as RunStatus,
      createdAt: stateData.createdAt as string,
      updatedAt: stateData.updatedAt as string,
      steps,
      budgets: stateData.budgets as any,
      currentStep: stateData.currentStep as string | undefined,
      pauseReason: stateData.pauseReason as string | undefined,
    };
  }

  private saveRunState(): void {
    this.runState.updatedAt = new Date().toISOString();
    this.runState.budgets = this.budgetTracker.getState();

    const stateData: Record<string, unknown> = {
      ...this.runState,
      steps: Object.fromEntries(this.runState.steps),
    };

    this.telemetryStore.saveState(this.runState.runId, stateData);
  }

  private emitEvent(type: TelemetryEvent['type'], payload: Record<string, unknown>): void {
    const event: TelemetryEvent = {
      id: TelemetryStore.generateEventId(),
      runId: this.runState.runId,
      ts: new Date().toISOString(),
      type,
      payload,
    };

    this.telemetryStore.append(event);
  }

  private getProvider(providerName: string, model: string): ProviderAdapter {
    const key = `${providerName}:${model}`;

    if (!this.providers.has(key)) {
      const provider = this.createProvider(providerName, model);
      this.providers.set(key, provider);
    }

    return this.providers.get(key)!;
  }

  private createProvider(providerName: string, model: string): ProviderAdapter {
    // Support mock provider for testing
    if (providerName === 'mock') {
      return new MockProvider();
    }
    
    if (providerName === 'openai') {
      return OpenAIProvider.fromEnv();
    }

    if (providerName === 'bionic' || providerName === 'openai-compatible') {
      if (!process.env.OPENAI_COMPATIBLE_BASE_URL || !process.env.OPENAI_COMPATIBLE_API_KEY) {
        throw new Error(`OpenAI-compatible provider requires OPENAI_COMPATIBLE_BASE_URL and OPENAI_COMPATIBLE_API_KEY`);
      }

      return new OpenAICompatibleProvider({
        type: 'openai-compatible',
        baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
        model: model || process.env.OPENAI_COMPATIBLE_MODEL,
      });
    }

    throw new Error(`Unknown provider: ${providerName}`);
  }

  private getAgent(agentId: string): AgentExecutor {
    if (!this.agents.has(agentId)) {
      const agentDef = this.workflow.agents.find(a => a.id === agentId);
      if (!agentDef) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const provider = this.getProvider(agentDef.provider, agentDef.model);
      const agent = new AgentExecutor(provider, {
        workspaceRoot: this.options.workspaceRoot,
        userId: this.options.userId,
      });

      this.agents.set(agentId, agent);
    }

    return this.agents.get(agentId)!;
  }

  private areStepDependenciesMet(step: WorkflowStep): boolean {
    for (const depId of step.needs) {
      const depState = this.runState.steps.get(depId);
      if (!depState || depState.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  private getReadySteps(): WorkflowStep[] {
    const ready: WorkflowStep[] = [];

    for (const step of this.workflow.steps) {
      const stepState = this.runState.steps.get(step.id);

      if (
        stepState &&
        stepState.status === 'pending' &&
        this.areStepDependenciesMet(step)
      ) {
        ready.push(step);
      }
    }

    return ready;
  }

  private async executeStep(step: WorkflowStep): Promise<void> {
    const stepState = this.runState.steps.get(step.id)!;

    stepState.status = 'running';
    stepState.startedAt = new Date().toISOString();
    stepState.attempts += 1;

    this.runState.currentStep = step.id;
    this.saveRunState();

    this.emitEvent('step_started', {
      stepId: step.id,
      agent: step.agent,
      action: step.action,
      attempt: stepState.attempts,
    });

    try {
      const agent = this.getAgent(step.agent);
      const agentDef = this.workflow.agents.find(a => a.id === step.agent)!;

      const prompt = this.buildStepPrompt(step);

      this.emitEvent('provider_call', {
        stepId: step.id,
        agent: step.agent,
        provider: agentDef.provider,
        model: agentDef.model,
        action: step.action,
      });

      const result = await agent.executeTurn(prompt);

      const estimatedTokens = BudgetTracker.estimateTokensForAction(step.action);
      const estimatedCost = BudgetTracker.estimateCostForTokens(estimatedTokens, agentDef.model);

      this.budgetTracker.addTokens(estimatedTokens);
      this.budgetTracker.addCost(estimatedCost);

      stepState.tokensUsed = (stepState.tokensUsed || 0) + estimatedTokens;
      stepState.costIncurred = (stepState.costIncurred || 0) + estimatedCost;

      stepState.status = 'completed';
      stepState.completedAt = new Date().toISOString();
      this.saveRunState();

      this.emitEvent('step_completed', {
        stepId: step.id,
        agent: step.agent,
        action: step.action,
        iterations: result.iterations,
        toolCalls: result.toolCalls,
        tokensUsed: estimatedTokens,
        costIncurred: estimatedCost,
      });

      const budgetCheck = this.budgetTracker.check();
      if (budgetCheck.exceeded) {
        throw new Error(`Budget exceeded: ${budgetCheck.budgetType}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stepState.error = errorMessage;

      this.emitEvent('step_failed', {
        stepId: step.id,
        agent: step.agent,
        action: step.action,
        attempt: stepState.attempts,
        error: errorMessage,
      });

      const maxRetries = this.workflow.budgets.retries || 0;
      const canRetry = stepState.attempts <= maxRetries;

      if (canRetry && this.workflow.onFailure === 'retry') {
        this.budgetTracker.incrementRetries();

        stepState.status = 'pending';
        this.saveRunState();

        this.emitEvent('step_retrying', {
          stepId: step.id,
          agent: step.agent,
          attempt: stepState.attempts + 1,
          maxRetries,
        });
      } else if (this.workflow.onFailure === 'pauseHuman') {
        stepState.status = 'paused';
        this.runState.status = 'paused';
        this.runState.pauseReason = `Step ${step.id} failed: ${errorMessage}`;
        this.saveRunState();

        this.emitEvent('run_paused', {
          reason: this.runState.pauseReason,
          stepId: step.id,
        });

        throw new Error(`Workflow paused for human intervention: ${this.runState.pauseReason}`);
      } else {
        stepState.status = 'failed';
        this.saveRunState();
        throw error;
      }
    }
  }

  private buildStepPrompt(step: WorkflowStep): string {
    const prompts: Record<string, string> = {
      implement_feature: 'Implement the requested feature with tests and documentation.',
      review_changes: 'Review the code changes, run tests, and provide feedback.',
      gate_merge: 'Review the workflow status and decide if the changes are ready to merge.',
      implement_and_open_pr: 'Implement the feature, write tests, and open a pull request.',
      review_diff_and_tests: 'Review the pull request diff and test results. Provide detailed feedback.',
    };

    return prompts[step.action] || `Execute action: ${step.action}`;
  }

  async run(): Promise<RunState> {
    if (this.runState.status === 'paused') {
      this.runState.status = 'running';
      this.emitEvent('run_resumed', { runId: this.runState.runId });
    } else if (this.runState.status === 'initialized') {
      this.runState.status = 'running';
      this.emitEvent('run_started', {
        workflowName: this.workflow.name,
        agents: this.workflow.agents.map(a => a.id),
        steps: this.workflow.steps.map(s => s.id),
      });
    }

    this.saveRunState();

    try {
      while (true) {
        const readySteps = this.getReadySteps();

        if (readySteps.length === 0) {
          const allCompleted = Array.from(this.runState.steps.values()).every(
            s => s.status === 'completed'
          );

          if (allCompleted) {
            break;
          }

          const hasPending = Array.from(this.runState.steps.values()).some(
            s => s.status === 'pending'
          );

          if (!hasPending) {
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const parallelSteps = readySteps.filter(s => s.parallel);
        const serialSteps = readySteps.filter(s => !s.parallel);

        if (parallelSteps.length > 0) {
          await Promise.all(parallelSteps.map(step => this.executeStep(step)));
        }

        if (serialSteps.length > 0) {
          for (const step of serialSteps) {
            await this.executeStep(step);
          }
        }
      }

      const allCompleted = Array.from(this.runState.steps.values()).every(
        s => s.status === 'completed'
      );

      if (allCompleted) {
        this.runState.status = 'completed';

        if (this.workflow.allowSupervisorMerge) {
          await this.attemptSupervisorMerge();
        }

        this.emitEvent('run_completed', {
          workflowName: this.workflow.name,
          duration: this.budgetTracker.getElapsedMs(),
          tokensUsed: this.budgetTracker.getState().tokensUsed,
          costIncurred: this.budgetTracker.getState().costIncurred,
        });

        WorkflowNotifier.notifySuccess(this.workflow.name);
      } else {
        this.runState.status = 'failed';
        this.emitEvent('run_failed', {
          reason: 'Some steps did not complete',
        });

        WorkflowNotifier.notifyFailure(this.workflow.name);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (this.runState.status !== 'paused' as RunStatus) {
        this.runState.status = 'failed';
        this.emitEvent('run_failed', { error: errorMessage });
        WorkflowNotifier.notifyFailure(this.workflow.name);
      }
    }

    this.saveRunState();
    return this.runState;
  }

  private async attemptSupervisorMerge(): Promise<void> {
    this.emitEvent('merge_attempted', {
      workflowName: this.workflow.name,
    });

    try {
      this.emitEvent('merge_completed', {
        workflowName: this.workflow.name,
        message: 'Merge capability stub - integrate with git/PR tools in production',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitEvent('merge_failed', {
        error: errorMessage,
      });
    }
  }

  getRunId(): string {
    return this.runState.runId;
  }

  getState(): RunState {
    return this.runState;
  }

  static async loadWorkflowFile(filePath: string): Promise<WorkflowDefinition> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Workflow file not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf8');

    let data: unknown;

    if (ext === '.json') {
      data = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      throw new Error('YAML parsing not yet implemented - use JSON for now');
    } else {
      throw new Error(`Unsupported workflow file format: ${ext}`);
    }

    const { WorkflowSchema } = await import('./schema');
    return WorkflowSchema.parse(data);
  }
}
