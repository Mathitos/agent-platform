import { describe, it, expect } from 'vitest';
import { WorkflowSchema } from './schema';

describe('WorkflowSchema', () => {
  describe('validation', () => {
    it('should validate a valid workflow definition', () => {
      const workflow = {
        name: 'test-workflow',
        budgets: {
          tokens: 100000,
          cost: 10.0,
          wallClockMs: 3600000,
          retries: 2,
        },
        agents: [
          {
            id: 'builder',
            role: 'builder',
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
        ],
        onFailure: 'pauseHuman',
        allowSupervisorMerge: false,
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject workflow without name', () => {
      const workflow = {
        budgets: {},
        agents: [],
        steps: [],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should reject workflow with empty name', () => {
      const workflow = {
        name: '   ',
        budgets: {},
        agents: [],
        steps: [],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should reject workflow without budgets', () => {
      const workflow = {
        name: 'test',
        agents: [],
        steps: [],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'budgets')).toBe(true);
    });

    it('should reject negative token budget', () => {
      const workflow = {
        name: 'test',
        budgets: { tokens: -100 },
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [{ id: 's', agent: 'a', needs: [], action: 'test' }],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'budgets.tokens')).toBe(true);
    });

    it('should reject negative cost budget', () => {
      const workflow = {
        name: 'test',
        budgets: { cost: -5.0 },
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [{ id: 's', agent: 'a', needs: [], action: 'test' }],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'budgets.cost')).toBe(true);
    });

    it('should reject fractional retries budget', () => {
      const workflow = {
        name: 'test',
        budgets: { retries: 2.5 },
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [{ id: 's', agent: 'a', needs: [], action: 'test' }],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'budgets.retries')).toBe(true);
    });

    it('should reject workflow without agents', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [],
        steps: [],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'agents')).toBe(true);
    });

    it('should reject agent without id', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [{ role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('agents[0].id'))).toBe(true);
    });

    it('should reject agent with invalid role', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [{ id: 'a', role: 'invalid-role', provider: 'openai', model: 'gpt-4' }],
        steps: [],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('agents[0].role'))).toBe(true);
    });

    it('should reject duplicate agent ids', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [
          { id: 'builder', role: 'builder', provider: 'openai', model: 'gpt-4' },
          { id: 'builder', role: 'reviewer', provider: 'openai', model: 'gpt-4' },
        ],
        steps: [{ id: 's', agent: 'builder', needs: [], action: 'test' }],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate agent id'))).toBe(true);
    });

    it('should reject workflow without steps', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'steps')).toBe(true);
    });

    it('should reject step without id', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [{ agent: 'a', needs: [], action: 'test' }],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('steps[0].id'))).toBe(true);
    });

    it('should reject step referencing non-existent agent', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [{ id: 's', agent: 'nonexistent', needs: [], action: 'test' }],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('steps[0].agent'))).toBe(true);
    });

    it('should reject duplicate step ids', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [
          { id: 'step1', agent: 'a', needs: [], action: 'test' },
          { id: 'step1', agent: 'a', needs: [], action: 'test' },
        ],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate step id'))).toBe(true);
    });

    it('should detect circular dependencies in steps', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [
          { id: 'step1', agent: 'a', needs: ['step2'], action: 'test' },
          { id: 'step2', agent: 'a', needs: ['step1'], action: 'test' },
        ],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Circular dependency'))).toBe(true);
    });

    it('should reject invalid onFailure strategy', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [{ id: 's', agent: 'a', needs: [], action: 'test' }],
        onFailure: 'invalid',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'onFailure')).toBe(true);
    });

    it('should reject non-boolean allowSupervisorMerge', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [{ id: 's', agent: 'a', needs: [], action: 'test' }],
        onFailure: 'abort',
        allowSupervisorMerge: 'yes',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'allowSupervisorMerge')).toBe(true);
    });

    it('should accept all valid agent roles', () => {
      const roles = ['builder', 'reviewer', 'supervisor', 'specialist'];

      for (const role of roles) {
        const workflow = {
          name: 'test',
          budgets: {},
          agents: [{ id: 'a', role, provider: 'openai', model: 'gpt-4' }],
          steps: [{ id: 's', agent: 'a', needs: [], action: 'test' }],
          onFailure: 'abort',
        };

        const result = WorkflowSchema.validate(workflow);
        expect(result.valid).toBe(true);
      }
    });

    it('should accept all valid onFailure strategies', () => {
      const strategies = ['retry', 'pauseHuman', 'abort'];

      for (const strategy of strategies) {
        const workflow = {
          name: 'test',
          budgets: {},
          agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
          steps: [{ id: 's', agent: 'a', needs: [], action: 'test' }],
          onFailure: strategy,
        };

        const result = WorkflowSchema.validate(workflow);
        expect(result.valid).toBe(true);
      }
    });

    it('should accept parallel flag on steps', () => {
      const workflow = {
        name: 'test',
        budgets: {},
        agents: [{ id: 'a', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [
          { id: 's1', agent: 'a', needs: [], action: 'test', parallel: true },
          { id: 's2', agent: 'a', needs: [], action: 'test', parallel: true },
        ],
        onFailure: 'abort',
      };

      const result = WorkflowSchema.validate(workflow);
      expect(result.valid).toBe(true);
    });
  });

  describe('parse', () => {
    it('should parse valid workflow and return typed definition', () => {
      const workflow = {
        name: 'test-workflow',
        budgets: { tokens: 100000 },
        agents: [{ id: 'builder', role: 'builder', provider: 'openai', model: 'gpt-4' }],
        steps: [{ id: 'build', agent: 'builder', needs: [], action: 'implement' }],
        onFailure: 'pauseHuman',
      };

      const parsed = WorkflowSchema.parse(workflow);
      expect(parsed.name).toBe('test-workflow');
      expect(parsed.agents).toHaveLength(1);
      expect(parsed.steps).toHaveLength(1);
    });

    it('should throw on invalid workflow', () => {
      const workflow = { name: '', budgets: {} };

      expect(() => WorkflowSchema.parse(workflow)).toThrow('Invalid workflow definition');
    });
  });

  describe('createTemplate', () => {
    it('should create a valid template workflow', () => {
      const template = WorkflowSchema.createTemplate('my-workflow');

      expect(template.name).toBe('my-workflow');
      expect(template.agents.length).toBeGreaterThan(0);
      expect(template.steps.length).toBeGreaterThan(0);

      const result = WorkflowSchema.validate(template);
      expect(result.valid).toBe(true);
    });

    it('should create template with default name', () => {
      const template = WorkflowSchema.createTemplate();

      expect(template.name).toBe('my-workflow');

      const result = WorkflowSchema.validate(template);
      expect(result.valid).toBe(true);
    });

    it('should include builder, reviewer, and supervisor agents', () => {
      const template = WorkflowSchema.createTemplate();

      const roles = template.agents.map(a => a.role);
      expect(roles).toContain('builder');
      expect(roles).toContain('reviewer');
      expect(roles).toContain('supervisor');
    });

    it('should include sequential workflow steps', () => {
      const template = WorkflowSchema.createTemplate();

      expect(template.steps.length).toBeGreaterThanOrEqual(3);

      const buildStep = template.steps.find(s => s.id === 'build');
      const reviewStep = template.steps.find(s => s.id === 'review');
      const superviseStep = template.steps.find(s => s.id === 'supervise');

      expect(buildStep).toBeDefined();
      expect(reviewStep).toBeDefined();
      expect(superviseStep).toBeDefined();

      expect(buildStep!.needs).toHaveLength(0);
      expect(reviewStep!.needs).toContain('build');
      expect(superviseStep!.needs).toContain('review');
    });

    it('should default allowSupervisorMerge to false', () => {
      const template = WorkflowSchema.createTemplate();

      expect(template.allowSupervisorMerge).toBe(false);
    });
  });
});
