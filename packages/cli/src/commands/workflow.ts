import { I18n } from '@loom/core';
import * as fs from 'fs';
import * as path from 'path';
import {
  WorkflowDefinition,
  WorkflowSchema,
  WorkflowRunner,
  WorkflowObservability,
} from '@loom/workflow';

/**
 * Workflow templates for scaffolding
 */
export class WorkflowTemplates {
  /**
   * Get the flagship PR workflow template
   */
  static getFlagshipTemplate(): WorkflowDefinition {
    return {
      name: 'flagship-pr-workflow',
      budgets: {
        tokens: 500000,
        cost: 25.0,
        wallClockMs: 7200000,
        retries: 2
      },
      agents: [
        {
          id: 'builder',
          role: 'builder',
          provider: 'openai',
          model: 'gpt-4'
        },
        {
          id: 'reviewer',
          role: 'reviewer',
          provider: 'bionic',
          model: 'qwen'
        },
        {
          id: 'supervisor',
          role: 'supervisor',
          provider: 'openai',
          model: 'gpt-4'
        }
      ],
      steps: [
        {
          id: 'build-pr',
          agent: 'builder',
          needs: [],
          action: 'implement_and_open_pr'
        },
        {
          id: 'review-pr',
          agent: 'reviewer',
          needs: ['build-pr'],
          action: 'review_diff_and_tests'
        },
        {
          id: 'supervise',
          agent: 'supervisor',
          needs: ['review-pr'],
          action: 'gate_merge'
        }
      ],
      onFailure: 'pauseHuman',
      allowSupervisorMerge: true
    };
  }

  /**
   * Get the default/basic workflow template
   */
  static getDefaultTemplate(): WorkflowDefinition {
    return {
      name: 'basic-workflow',
      budgets: {
        tokens: 100000,
        wallClockMs: 3600000,
        retries: 1
      },
      agents: [
        {
          id: 'agent',
          role: 'builder',
          provider: 'openai',
          model: 'gpt-3.5-turbo'
        }
      ],
      steps: [
        {
          id: 'execute',
          agent: 'agent',
          needs: [],
          action: 'execute_task'
        }
      ],
      onFailure: 'retry',
      allowSupervisorMerge: false
    };
  }

  /**
   * Convert workflow definition to YAML string with comments
   */
  static toYaml(workflow: WorkflowDefinition, includeComments: boolean = true): string {
    const lines: string[] = [];

    if (includeComments) {
      lines.push('# Loom Workflow Definition');
      lines.push('# See docs/adr/002-workflow-schema.md for details');
      lines.push('');
    }

    lines.push(`name: ${workflow.name}`);
    lines.push('');

    if (workflow.budgets) {
      if (includeComments) {
        lines.push('# Budget constraints for the workflow');
      }
      lines.push('budgets:');
      if (workflow.budgets.tokens !== undefined) {
        lines.push(`  tokens: ${workflow.budgets.tokens}${includeComments ? '  # Max tokens across all agents' : ''}`);
      }
      if (workflow.budgets.cost !== undefined) {
        lines.push(`  cost: ${workflow.budgets.cost}${includeComments ? '  # Max cost in USD' : ''}`);
      }
      if (workflow.budgets.wallClockMs !== undefined) {
        lines.push(`  wallClockMs: ${workflow.budgets.wallClockMs}${includeComments ? '  # Max execution time in milliseconds' : ''}`);
      }
      if (workflow.budgets.retries !== undefined) {
        lines.push(`  retries: ${workflow.budgets.retries}${includeComments ? '  # Max retry attempts on failure' : ''}`);
      }
      lines.push('');
    }

    if (includeComments) {
      lines.push('# Agents participating in this workflow');
      lines.push('# Configure providers via environment variables:');
      lines.push('#   OPENAI_API_KEY - for OpenAI provider');
      lines.push('#   OPENAI_COMPATIBLE_BASE_URL, OPENAI_COMPATIBLE_API_KEY - for Bionic/compatible providers');
    }
    lines.push('agents:');
    for (const agent of workflow.agents) {
      lines.push(`  - id: ${agent.id}`);
      lines.push(`    role: ${agent.role}`);
      lines.push(`    provider: ${agent.provider}`);
      if (agent.model) {
        lines.push(`    model: ${agent.model}`);
      }
    }
    lines.push('');

    if (includeComments) {
      lines.push('# Workflow steps - executed based on dependency graph (needs)');
    }
    lines.push('steps:');
    for (const step of workflow.steps) {
      lines.push(`  - id: ${step.id}`);
      lines.push(`    agent: ${step.agent}`);
      lines.push(`    needs: [${step.needs.join(', ')}]`);
      lines.push(`    action: ${step.action}`);
    }
    lines.push('');

    if (workflow.onFailure) {
      if (includeComments) {
        lines.push('# What to do when a step fails: retry, pauseHuman, abort');
      }
      lines.push(`onFailure: ${workflow.onFailure}`);
    }

    if (workflow.allowSupervisorMerge !== undefined) {
      if (includeComments) {
        lines.push('# Whether supervisor can auto-merge when checks pass');
      }
      lines.push(`allowSupervisorMerge: ${workflow.allowSupervisorMerge}`);
    }

    return lines.join('\n');
  }
}

export class WorkflowCommand {
  static async execute(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.showHelp();
      return;
    }

    const subcommand = args[0];

    switch (subcommand) {
      case 'init':
        await this.init(args.slice(1));
        break;
      case 'run':
        await this.run(args.slice(1));
        break;
      case 'status':
        await this.status(args.slice(1));
        break;
      case 'logs':
        await this.logs(args.slice(1));
        break;
      case 'report':
        await this.report(args.slice(1));
        break;
      default:
        const t = I18n.t.bind(I18n);
        console.error(t('cli.unknownCommand')(`workflow ${subcommand}`));
        this.showHelp();
        process.exit(1);
    }
  }

  private static showHelp(): void {
    const t = I18n.t.bind(I18n);
    console.log(`
${t('workflow.help.title')}

${t('workflow.help.usage')}:

  loom workflow init [--template <name>]  ${t('workflow.help.init')}
  loom workflow run <file>                Run a workflow from a file
  loom workflow status <runId>            Show status of a workflow run
  loom workflow logs <runId>              Show logs for a workflow run
  loom workflow report <runId>            Generate a report for a workflow run

${t('workflow.help.templates')}:
  default   ${t('workflow.help.templates.default')}
  flagship  ${t('workflow.help.templates.flagship')}
  pr        ${t('workflow.help.templates.pr')}

Examples:

  loom workflow init --template flagship
  loom workflow run .loom/workflow.yaml
  loom workflow status run_1234567890_abcdef
  loom workflow logs run_1234567890_abcdef
  loom workflow report run_1234567890_abcdef
`);
  }

  private static async init(args: string[]): Promise<void> {
    const t = I18n.t.bind(I18n);
    
    // Check for template option
    let templateName: string | null = null;
    for (let i = 0; i < args.length; i++) {
      if ((args[i] === '--template' || args[i] === '-t') && i + 1 < args.length) {
        templateName = args[i + 1];
        break;
      }
    }

    // If template specified, use template scaffolding
    if (templateName) {
      await this.initWithTemplate(templateName);
      return;
    }

    // Legacy JSON-based init (keep for backward compatibility)
    const workflowName = args[0] || 'my-workflow';
    const fileName = `${workflowName}.json`;

    if (fs.existsSync(fileName)) {
      console.error(`Error: File already exists: ${fileName}`);
      process.exit(1);
    }

    const template = WorkflowSchema.createTemplate(workflowName);
    fs.writeFileSync(fileName, JSON.stringify(template, null, 2), 'utf8');

    console.log(`✅ Created workflow file: ${fileName}`);
    console.log(`\nEdit the file to customize your workflow, then run:`);
    console.log(`  loom workflow run ${fileName}`);
  }

  private static async initWithTemplate(templateName: string): Promise<void> {
    const t = I18n.t.bind(I18n);
    
    // Get template
    let workflow: WorkflowDefinition;
    if (templateName === 'flagship' || templateName === 'pr') {
      workflow = WorkflowTemplates.getFlagshipTemplate();
    } else if (templateName === 'default') {
      workflow = WorkflowTemplates.getDefaultTemplate();
    } else {
      console.error(t('workflow.errors.unknownTemplate')(templateName));
      process.exit(1);
      return;
    }

    // Validate
    const validation = WorkflowSchema.validate(workflow);
    if (!validation.valid) {
      console.error(t('workflow.errors.invalidTemplate')(validation.errors.map(e => e.message).join(', ')));
      process.exit(1);
      return;
    }

    // Create .loom directory if it doesn't exist
    const loomDir = path.join(process.cwd(), '.loom');
    if (!fs.existsSync(loomDir)) {
      fs.mkdirSync(loomDir, { recursive: true });
    }

    // Write workflow file
    const workflowPath = path.join(loomDir, 'workflow.yaml');
    if (fs.existsSync(workflowPath)) {
      console.error(t('workflow.errors.fileExists')(workflowPath));
      process.exit(1);
      return;
    }

    const yamlContent = WorkflowTemplates.toYaml(workflow, true);
    fs.writeFileSync(workflowPath, yamlContent, 'utf-8');

    console.log(t('workflow.init.success')(workflowPath));
    console.log('');
    console.log(t('workflow.init.nextSteps'));
    console.log(`  1. ${t('workflow.init.nextSteps.configure')}`);
    console.log(`  2. ${t('workflow.init.nextSteps.customize')}`);
    console.log(`  3. ${t('workflow.init.nextSteps.run')}`);
  }

  /**
   * Initialize workflow for testing - accepts a target directory
   * @internal
   */
  static async initInDirectory(templateName: string, targetDir: string): Promise<string> {
    let workflow: WorkflowDefinition;
    if (templateName === 'flagship' || templateName === 'pr') {
      workflow = WorkflowTemplates.getFlagshipTemplate();
    } else if (templateName === 'default') {
      workflow = WorkflowTemplates.getDefaultTemplate();
    } else {
      throw new Error(`Unknown template: ${templateName}`);
    }

    const validation = WorkflowSchema.validate(workflow);
    if (!validation.valid) {
      throw new Error(validation.errors.map(e => e.message).join(', '));
    }

    const loomDir = path.join(targetDir, '.loom');
    if (!fs.existsSync(loomDir)) {
      fs.mkdirSync(loomDir, { recursive: true });
    }

    const workflowPath = path.join(loomDir, 'workflow.yaml');
    if (fs.existsSync(workflowPath)) {
      throw new Error(`File already exists: ${workflowPath}`);
    }

    const yamlContent = WorkflowTemplates.toYaml(workflow, true);
    fs.writeFileSync(workflowPath, yamlContent, 'utf-8');

    return workflowPath;
  }

  private static async run(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.error('Error: Workflow file path is required');
      console.log('Usage: loom workflow run <file>');
      process.exit(1);
    }

    const workflowFile = args[0];
    const resumeRunId = this.getArgValue(args, '--resume');

    if (!fs.existsSync(workflowFile)) {
      console.error(`Error: Workflow file not found: ${workflowFile}`);
      process.exit(1);
    }

    try {
      console.log(`Loading workflow from: ${workflowFile}`);
      const workflow = await WorkflowRunner.loadWorkflowFile(workflowFile);

      console.log(`Starting workflow: ${workflow.name}`);

      const runner = new WorkflowRunner(workflow, {
        workflowFile,
        workspaceRoot: process.cwd(),
        userId: 'default',
        resumeRunId: resumeRunId || undefined,
      });

      const runState = await runner.run();

      console.log(`\n✅ Workflow completed`);
      console.log(`Run ID: ${runState.runId}`);
      console.log(`Status: ${runState.status}`);
      console.log(`\nView details with:`);
      console.log(`  loom workflow status ${runState.runId}`);
      console.log(`  loom workflow report ${runState.runId}`);
    } catch (error) {
      console.error(`\n❌ Workflow failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private static async status(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.error('Error: Run ID is required');
      console.log('Usage: loom workflow status <runId>');
      process.exit(1);
    }

    const runId = args[0];
    const observability = new WorkflowObservability();

    try {
      const status = observability.status({ runId });
      console.log(status);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private static async logs(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.error('Error: Run ID is required');
      console.log('Usage: loom workflow logs <runId> [--type <eventType>] [--limit <number>]');
      process.exit(1);
    }

    const runId = args[0];
    const eventType = this.getArgValue(args, '--type');
    const limitStr = this.getArgValue(args, '--limit');
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    const observability = new WorkflowObservability();

    try {
      const logs = observability.logs({
        runId,
        eventType: eventType as any,
        limit,
      });
      console.log(logs);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private static async report(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.error('Error: Run ID is required');
      console.log('Usage: loom workflow report <runId>');
      process.exit(1);
    }

    const runId = args[0];
    const observability = new WorkflowObservability();

    try {
      const report = observability.report({ runId });
      const formatted = observability.formatReport(report);
      console.log(formatted);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private static getArgValue(args: string[], flag: string): string | null {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
    return null;
  }
}
