import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowTemplates } from './workflow';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('WorkflowTemplates', () => {
  describe('getFlagshipTemplate', () => {
    it('should return a valid flagship template', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();

      expect(template.name).toBe('flagship-pr-workflow');
      expect(template.agents).toHaveLength(3);
      expect(template.steps).toHaveLength(3);
      expect(template.onFailure).toBe('pauseHuman');
      expect(template.allowSupervisorMerge).toBe(true);
    });

    it('should have builder, reviewer, and supervisor agents', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();
      const agentIds = template.agents.map(a => a.id);

      expect(agentIds).toContain('builder');
      expect(agentIds).toContain('reviewer');
      expect(agentIds).toContain('supervisor');
    });

    it('should use OpenAI for builder and supervisor', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();
      const builder = template.agents.find(a => a.id === 'builder');
      const supervisor = template.agents.find(a => a.id === 'supervisor');

      expect(builder?.provider).toBe('openai');
      expect(supervisor?.provider).toBe('openai');
    });

    it('should use Bionic for reviewer', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();
      const reviewer = template.agents.find(a => a.id === 'reviewer');

      expect(reviewer?.provider).toBe('bionic');
      expect(reviewer?.model).toBe('qwen');
    });

    it('should have correct step dependencies', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();
      const buildStep = template.steps.find(s => s.id === 'build-pr');
      const reviewStep = template.steps.find(s => s.id === 'review-pr');
      const superviseStep = template.steps.find(s => s.id === 'supervise');

      expect(buildStep?.needs).toEqual([]);
      expect(reviewStep?.needs).toEqual(['build-pr']);
      expect(superviseStep?.needs).toEqual(['review-pr']);
    });

    it('should include budgets', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();

      expect(template.budgets).toBeDefined();
      expect(template.budgets?.tokens).toBe(500000);
      expect(template.budgets?.cost).toBe(25.0);
      expect(template.budgets?.wallClockMs).toBe(7200000);
      expect(template.budgets?.retries).toBe(2);
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return a valid default template', () => {
      const template = WorkflowTemplates.getDefaultTemplate();

      expect(template.name).toBe('basic-workflow');
      expect(template.agents).toHaveLength(1);
      expect(template.steps).toHaveLength(1);
      expect(template.onFailure).toBe('retry');
      expect(template.allowSupervisorMerge).toBe(false);
    });

    it('should have a single agent', () => {
      const template = WorkflowTemplates.getDefaultTemplate();

      expect(template.agents[0].id).toBe('agent');
      expect(template.agents[0].provider).toBe('openai');
      expect(template.agents[0].role).toBe('builder');
    });
  });

  describe('toYaml', () => {
    it('should generate valid YAML with comments', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();
      const yaml = WorkflowTemplates.toYaml(template, true);

      expect(yaml).toContain('name: flagship-pr-workflow');
      expect(yaml).toContain('# Loom Workflow Definition');
      expect(yaml).toContain('budgets:');
      expect(yaml).toContain('agents:');
      expect(yaml).toContain('steps:');
      expect(yaml).toContain('onFailure: pauseHuman');
      expect(yaml).toContain('allowSupervisorMerge: true');
    });

    it('should generate valid YAML without comments', () => {
      const template = WorkflowTemplates.getDefaultTemplate();
      const yaml = WorkflowTemplates.toYaml(template, false);

      expect(yaml).toContain('name: basic-workflow');
      expect(yaml).not.toContain('#');
      expect(yaml).toContain('agents:');
      expect(yaml).toContain('steps:');
    });

    it('should include all agent properties', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();
      const yaml = WorkflowTemplates.toYaml(template, true);

      expect(yaml).toContain('id: builder');
      expect(yaml).toContain('role: builder');
      expect(yaml).toContain('provider: openai');
      expect(yaml).toContain('model: gpt-4');
    });

    it('should include all step properties', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();
      const yaml = WorkflowTemplates.toYaml(template, true);

      expect(yaml).toContain('id: build-pr');
      expect(yaml).toContain('agent: builder');
      expect(yaml).toContain('needs: []');
      expect(yaml).toContain('action: implement_and_open_pr');
    });

    it('should include budget comments', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();
      const yaml = WorkflowTemplates.toYaml(template, true);

      expect(yaml).toContain('# Max tokens across all agents');
      expect(yaml).toContain('# Max cost in USD');
      expect(yaml).toContain('# Max execution time in milliseconds');
      expect(yaml).toContain('# Max retry attempts on failure');
    });

    it('should include environment variable comments', () => {
      const template = WorkflowTemplates.getFlagshipTemplate();
      const yaml = WorkflowTemplates.toYaml(template, true);

      expect(yaml).toContain('OPENAI_API_KEY');
      expect(yaml).toContain('OPENAI_COMPATIBLE_BASE_URL');
      expect(yaml).toContain('OPENAI_COMPATIBLE_API_KEY');
    });
  });
});

describe('WorkflowCommand integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-workflow-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('workflow init with templates', () => {
    it('should create .loom directory', async () => {
      const { WorkflowCommand } = await import('./workflow');

      await WorkflowCommand.initInDirectory('default', tempDir);

      const loomDir = path.join(tempDir, '.loom');
      expect(fs.existsSync(loomDir)).toBe(true);
    });

    it('should create workflow.yaml with default template', async () => {
      const { WorkflowCommand } = await import('./workflow');

      const workflowPath = await WorkflowCommand.initInDirectory('default', tempDir);

      expect(fs.existsSync(workflowPath)).toBe(true);

      const content = fs.readFileSync(workflowPath, 'utf-8');
      expect(content).toContain('name: basic-workflow');
    });

    it('should create workflow.yaml with flagship template', async () => {
      const { WorkflowCommand } = await import('./workflow');

      const workflowPath = await WorkflowCommand.initInDirectory('flagship', tempDir);

      expect(fs.existsSync(workflowPath)).toBe(true);

      const content = fs.readFileSync(workflowPath, 'utf-8');
      expect(content).toContain('name: flagship-pr-workflow');
      expect(content).toContain('id: builder');
      expect(content).toContain('id: reviewer');
      expect(content).toContain('id: supervisor');
    });

    it('should accept "pr" as alias for flagship template', async () => {
      const { WorkflowCommand } = await import('./workflow');

      const workflowPath = await WorkflowCommand.initInDirectory('pr', tempDir);

      const content = fs.readFileSync(workflowPath, 'utf-8');
      expect(content).toContain('name: flagship-pr-workflow');
    });

    it('should not overwrite existing workflow.yaml', async () => {
      const { WorkflowCommand } = await import('./workflow');

      // Create first workflow
      await WorkflowCommand.initInDirectory('default', tempDir);
      expect(fs.existsSync(path.join(tempDir, '.loom', 'workflow.yaml'))).toBe(true);

      // Try to create again - should throw
      await expect(WorkflowCommand.initInDirectory('default', tempDir)).rejects.toThrow('File already exists');
    });

    it('should validate template before writing', async () => {
      const { WorkflowCommand } = await import('./workflow');

      const workflowPath = await WorkflowCommand.initInDirectory('flagship', tempDir);

      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    it('should reject unknown template', async () => {
      const { WorkflowCommand } = await import('./workflow');

      await expect(WorkflowCommand.initInDirectory('unknown', tempDir)).rejects.toThrow('Unknown template');
    });
  });
});
