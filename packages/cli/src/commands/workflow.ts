import * as fs from 'fs';
import * as path from 'path';
import {
  WorkflowSchema,
  WorkflowRunner,
  WorkflowObservability,
} from '@loom/workflow';

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
        console.error(`Unknown workflow subcommand: ${subcommand}`);
        this.showHelp();
        process.exit(1);
    }
  }

  private static showHelp(): void {
    console.log(`
Loom Workflow Commands:

  loom workflow init [name]      Initialize a new workflow YAML/JSON file
  loom workflow run <file>       Run a workflow from a file
  loom workflow status <runId>   Show status of a workflow run
  loom workflow logs <runId>     Show logs for a workflow run
  loom workflow report <runId>   Generate a report for a workflow run

Examples:

  loom workflow init my-workflow
  loom workflow run workflow.json
  loom workflow status run_1234567890_abcdef
  loom workflow logs run_1234567890_abcdef
  loom workflow report run_1234567890_abcdef
`);
  }

  private static async init(args: string[]): Promise<void> {
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
