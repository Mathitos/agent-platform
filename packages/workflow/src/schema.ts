import { WorkflowDefinition, AgentRole, OnFailureStrategy } from './types';

export interface ValidationError {
  field: string;
  message: string;
}

export class WorkflowSchema {
  static validate(data: unknown): { valid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({ field: 'root', message: 'Workflow definition must be an object' });
      return { valid: false, errors };
    }

    const workflow = data as Record<string, unknown>;

    if (!workflow.name || typeof workflow.name !== 'string' || workflow.name.trim() === '') {
      errors.push({ field: 'name', message: 'Workflow name is required and must be a non-empty string' });
    }

    if (!workflow.budgets || typeof workflow.budgets !== 'object') {
      errors.push({ field: 'budgets', message: 'Budgets object is required' });
    } else {
      const budgets = workflow.budgets as Record<string, unknown>;

      if (budgets.tokens !== undefined && (typeof budgets.tokens !== 'number' || budgets.tokens <= 0)) {
        errors.push({ field: 'budgets.tokens', message: 'Tokens budget must be a positive number' });
      }

      if (budgets.cost !== undefined && (typeof budgets.cost !== 'number' || budgets.cost <= 0)) {
        errors.push({ field: 'budgets.cost', message: 'Cost budget must be a positive number' });
      }

      if (budgets.wallClockMs !== undefined && (typeof budgets.wallClockMs !== 'number' || budgets.wallClockMs <= 0)) {
        errors.push({ field: 'budgets.wallClockMs', message: 'Wall clock budget must be a positive number' });
      }

      if (budgets.retries !== undefined && (typeof budgets.retries !== 'number' || budgets.retries < 0 || !Number.isInteger(budgets.retries))) {
        errors.push({ field: 'budgets.retries', message: 'Retries budget must be a non-negative integer' });
      }
    }

    if (!Array.isArray(workflow.agents) || workflow.agents.length === 0) {
      errors.push({ field: 'agents', message: 'Agents array is required and must not be empty' });
    } else {
      const agentIds = new Set<string>();
      const validRoles: AgentRole[] = ['builder', 'reviewer', 'supervisor', 'specialist'];

      workflow.agents.forEach((agent: unknown, index: number) => {
        if (!agent || typeof agent !== 'object') {
          errors.push({ field: `agents[${index}]`, message: 'Agent must be an object' });
          return;
        }

        const agentObj = agent as Record<string, unknown>;

        if (!agentObj.id || typeof agentObj.id !== 'string' || agentObj.id.trim() === '') {
          errors.push({ field: `agents[${index}].id`, message: 'Agent id is required and must be a non-empty string' });
        } else if (agentIds.has(agentObj.id as string)) {
          errors.push({ field: `agents[${index}].id`, message: `Duplicate agent id: ${agentObj.id}` });
        } else {
          agentIds.add(agentObj.id as string);
        }

        if (!agentObj.role || !validRoles.includes(agentObj.role as AgentRole)) {
          errors.push({ field: `agents[${index}].role`, message: `Agent role must be one of: ${validRoles.join(', ')}` });
        }

        if (!agentObj.provider || typeof agentObj.provider !== 'string' || agentObj.provider.trim() === '') {
          errors.push({ field: `agents[${index}].provider`, message: 'Agent provider is required and must be a non-empty string' });
        }

        if (!agentObj.model || typeof agentObj.model !== 'string' || agentObj.model.trim() === '') {
          errors.push({ field: `agents[${index}].model`, message: 'Agent model is required and must be a non-empty string' });
        }
      });
    }

    if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      errors.push({ field: 'steps', message: 'Steps array is required and must not be empty' });
    } else {
      const stepIds = new Set<string>();
      const agentIds = new Set(Array.isArray(workflow.agents) ? workflow.agents.map((a: any) => a.id) : []);

      workflow.steps.forEach((step: unknown, index: number) => {
        if (!step || typeof step !== 'object') {
          errors.push({ field: `steps[${index}]`, message: 'Step must be an object' });
          return;
        }

        const stepObj = step as Record<string, unknown>;

        if (!stepObj.id || typeof stepObj.id !== 'string' || stepObj.id.trim() === '') {
          errors.push({ field: `steps[${index}].id`, message: 'Step id is required and must be a non-empty string' });
        } else if (stepIds.has(stepObj.id as string)) {
          errors.push({ field: `steps[${index}].id`, message: `Duplicate step id: ${stepObj.id}` });
        } else {
          stepIds.add(stepObj.id as string);
        }

        if (!stepObj.agent || typeof stepObj.agent !== 'string' || !agentIds.has(stepObj.agent as string)) {
          errors.push({ field: `steps[${index}].agent`, message: 'Step agent must reference a valid agent id' });
        }

        if (!Array.isArray(stepObj.needs)) {
          errors.push({ field: `steps[${index}].needs`, message: 'Step needs must be an array' });
        } else {
          (stepObj.needs as unknown[]).forEach((need: unknown, needIndex: number) => {
            if (typeof need !== 'string') {
              errors.push({ field: `steps[${index}].needs[${needIndex}]`, message: 'Step dependency must be a string' });
            }
          });
        }

        if (!stepObj.action || typeof stepObj.action !== 'string' || stepObj.action.trim() === '') {
          errors.push({ field: `steps[${index}].action`, message: 'Step action is required and must be a non-empty string' });
        }

        if (stepObj.parallel !== undefined && typeof stepObj.parallel !== 'boolean') {
          errors.push({ field: `steps[${index}].parallel`, message: 'Step parallel flag must be a boolean' });
        }
      });

      this.detectCycles(workflow.steps as any[], errors);
    }

    const validFailureStrategies: OnFailureStrategy[] = ['retry', 'pauseHuman', 'abort'];
    if (!workflow.onFailure || !validFailureStrategies.includes(workflow.onFailure as OnFailureStrategy)) {
      errors.push({ field: 'onFailure', message: `onFailure must be one of: ${validFailureStrategies.join(', ')}` });
    }

    if (workflow.allowSupervisorMerge !== undefined && typeof workflow.allowSupervisorMerge !== 'boolean') {
      errors.push({ field: 'allowSupervisorMerge', message: 'allowSupervisorMerge must be a boolean' });
    }

    return { valid: errors.length === 0, errors };
  }

  private static detectCycles(steps: Array<{ id: string; needs: string[] }>, errors: ValidationError[]): void {
    const graph = new Map<string, string[]>();
    const stepIds = new Set(steps.map(s => s.id));

    for (const step of steps) {
      graph.set(step.id, step.needs.filter(need => stepIds.has(need)));
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (!visited.has(stepId)) {
        visited.add(stepId);
        recStack.add(stepId);

        const neighbors = graph.get(stepId) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor) && hasCycle(neighbor)) {
            return true;
          } else if (recStack.has(neighbor)) {
            return true;
          }
        }
      }

      recStack.delete(stepId);
      return false;
    };

    for (const stepId of stepIds) {
      if (hasCycle(stepId)) {
        errors.push({ field: 'steps', message: 'Circular dependency detected in workflow steps' });
        break;
      }
    }
  }

  static parse(data: unknown): WorkflowDefinition {
    const { valid, errors } = this.validate(data);

    if (!valid) {
      const errorMessages = errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw new Error(`Invalid workflow definition: ${errorMessages}`);
    }

    return data as WorkflowDefinition;
  }

  static createTemplate(name: string = 'my-workflow'): WorkflowDefinition {
    return {
      name,
      budgets: {
        tokens: 500000,
        cost: 25.0,
        wallClockMs: 7200000,
        retries: 2,
      },
      agents: [
        {
          id: 'builder',
          role: 'builder',
          provider: 'openai',
          model: 'gpt-4',
        },
        {
          id: 'reviewer',
          role: 'reviewer',
          provider: 'bionic',
          model: 'qwen',
        },
        {
          id: 'supervisor',
          role: 'supervisor',
          provider: 'openai',
          model: 'gpt-4',
        },
      ],
      steps: [
        {
          id: 'build',
          agent: 'builder',
          needs: [],
          action: 'implement_feature',
        },
        {
          id: 'review',
          agent: 'reviewer',
          needs: ['build'],
          action: 'review_changes',
        },
        {
          id: 'supervise',
          agent: 'supervisor',
          needs: ['review'],
          action: 'gate_merge',
        },
      ],
      onFailure: 'pauseHuman',
      allowSupervisorMerge: false,
    };
  }
}
