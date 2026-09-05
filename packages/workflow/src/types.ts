export interface WorkflowBudgets {
  tokens?: number;
  cost?: number;
  wallClockMs?: number;
  retries?: number;
}

export type AgentRole = 'builder' | 'reviewer' | 'supervisor' | 'specialist';

export type OnFailureStrategy = 'retry' | 'pauseHuman' | 'abort';

export interface WorkflowAgent {
  id: string;
  role: AgentRole;
  provider: string;
  model: string;
}

export interface WorkflowStep {
  id: string;
  agent: string;
  needs: string[];
  action: string;
  parallel?: boolean;
}

export interface WorkflowDefinition {
  name: string;
  budgets: WorkflowBudgets;
  agents: WorkflowAgent[];
  steps: WorkflowStep[];
  onFailure: OnFailureStrategy;
  allowSupervisorMerge?: boolean;
}

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export type RunStatus = 'initialized' | 'running' | 'paused' | 'completed' | 'failed' | 'aborted';

export interface StepState {
  stepId: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  attempts: number;
  error?: string;
  tokensUsed?: number;
  costIncurred?: number;
}

export interface BudgetState {
  tokensUsed: number;
  costIncurred: number;
  wallClockStartMs: number;
  retriesUsed: number;
}

export interface RunState {
  runId: string;
  workflowName: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  steps: Map<string, StepState>;
  budgets: BudgetState;
  currentStep?: string;
  pauseReason?: string;
}

export type TelemetryEventType =
  | 'run_started'
  | 'run_completed'
  | 'run_failed'
  | 'run_paused'
  | 'run_resumed'
  | 'run_aborted'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'step_retrying'
  | 'budget_warning'
  | 'budget_exceeded'
  | 'provider_call'
  | 'artifact_created'
  | 'merge_attempted'
  | 'merge_completed'
  | 'merge_failed';

export interface TelemetryEvent {
  readonly id: string;
  readonly runId: string;
  readonly ts: string;
  readonly type: TelemetryEventType;
  readonly payload: Record<string, unknown>;
}

export interface WorkflowRunOptions {
  workflowFile: string;
  workspaceRoot: string;
  userId?: string;
  resumeRunId?: string;
}

export interface WorkflowStatusOptions {
  runId: string;
  userId?: string;
}

export interface WorkflowLogsOptions {
  runId: string;
  userId?: string;
  eventType?: TelemetryEventType;
  limit?: number;
}

export interface WorkflowReportOptions {
  runId: string;
  userId?: string;
}

export interface WorkflowReport {
  runId: string;
  workflowName: string;
  status: RunStatus;
  duration: number;
  tokensUsed: number;
  costIncurred: number;
  stepsCompleted: number;
  stepsFailed: number;
  retriesUsed: number;
  artifacts: string[];
}
