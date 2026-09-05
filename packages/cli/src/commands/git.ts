import { GitOperations } from '@loom/tools';

export interface GitCommandOptions {
  cwd?: string;
}

/**
 * Handle git status command
 */
export async function handleGitStatus(options: GitCommandOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();

  try {
    const isRepo = await GitOperations.isGitRepo(cwd);
    if (!isRepo) {
      console.error('Error: Not a git repository');
      process.exit(1);
    }

    const result = await GitOperations.status(cwd);

    if (result.exitCode !== 0) {
      console.error('Error:', result.stderr || 'Failed to get git status');
      process.exit(result.exitCode);
    }

    console.log(result.stdout || 'Working tree clean');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Handle git diff command
 */
export async function handleGitDiff(
  staged: boolean = false,
  files: string[] = [],
  options: GitCommandOptions = {}
): Promise<void> {
  const cwd = options.cwd || process.cwd();

  try {
    const isRepo = await GitOperations.isGitRepo(cwd);
    if (!isRepo) {
      console.error('Error: Not a git repository');
      process.exit(1);
    }

    const result = await GitOperations.diff(cwd, staged, files.length > 0 ? files : undefined);

    if (result.exitCode !== 0) {
      console.error('Error:', result.stderr || 'Failed to get git diff');
      process.exit(result.exitCode);
    }

    console.log(result.stdout || 'No changes');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Handle git commit command
 */
export async function handleGitCommit(
  message: string,
  files: string[] = [],
  options: GitCommandOptions = {}
): Promise<void> {
  const cwd = options.cwd || process.cwd();

  try {
    if (!message) {
      console.error('Error: Commit message is required');
      process.exit(1);
    }

    const isRepo = await GitOperations.isGitRepo(cwd);
    if (!isRepo) {
      console.error('Error: Not a git repository');
      process.exit(1);
    }

    const result = await GitOperations.commit(cwd, message, files.length > 0 ? files : undefined);

    if (result.exitCode !== 0) {
      console.error('Error:', result.stderr || result.stdout || 'Failed to commit');
      process.exit(result.exitCode);
    }

    console.log(result.stdout || 'Changes committed successfully');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Handle git branch-info command
 */
export async function handleGitBranchInfo(options: GitCommandOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();

  try {
    const isRepo = await GitOperations.isGitRepo(cwd);
    if (!isRepo) {
      console.error('Error: Not a git repository');
      process.exit(1);
    }

    const [branchResult, currentResult] = await Promise.all([
      GitOperations.branchInfo(cwd),
      GitOperations.getCurrentBranch(cwd),
    ]);

    if (branchResult.exitCode !== 0) {
      console.error('Error:', branchResult.stderr || 'Failed to get branch info');
      process.exit(branchResult.exitCode);
    }

    console.log(`Current branch: ${currentResult.stdout || 'unknown'}\n`);
    console.log('All branches:');
    console.log(branchResult.stdout);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Main git command handler
 */
export async function handleGitCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (!subcommand) {
    console.log('Usage: loom git <subcommand> [options]');
    console.log('');
    console.log('Subcommands:');
    console.log('  status              Show git status');
    console.log('  diff [--staged]     Show git diff');
    console.log('  commit <message>    Commit changes');
    console.log('  branch-info         Show branch information');
    process.exit(0);
  }

  switch (subcommand) {
    case 'status':
      await handleGitStatus();
      break;

    case 'diff': {
      const staged = args.includes('--staged');
      const files = args.slice(1).filter(arg => arg !== '--staged');
      await handleGitDiff(staged, files);
      break;
    }

    case 'commit': {
      const messageIndex = args.findIndex(arg => arg === '-m' || arg === '--message');
      let message = '';
      let files: string[] = [];

      if (messageIndex >= 0 && args[messageIndex + 1]) {
        message = args[messageIndex + 1];
        files = args.slice(1).filter((arg, idx) => 
          idx !== messageIndex && idx !== messageIndex + 1 && arg !== '-m' && arg !== '--message'
        );
      } else if (args[1]) {
        message = args[1];
        files = args.slice(2);
      }

      await handleGitCommit(message, files);
      break;
    }

    case 'branch-info':
      await handleGitBranchInfo();
      break;

    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.log('Run "loom git" for usage information');
      process.exit(1);
  }
}
