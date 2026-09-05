import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PRCreateTool, PRViewTool, PRListTool } from './pr-tools';
import { GhOperations, GhRunner, GhCommandResult } from './gh-runner';
import { ToolExecutionContext } from './types';

describe('PR Tools with Mock Runner', () => {
  let mockRunner: GhRunner;
  let context: ToolExecutionContext;

  beforeEach(() => {
    context = {
      workspaceRoot: '/test/workspace',
      userId: 'test-user',
      trustedPaths: [],
    };

    mockRunner = {
      exec: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    GhOperations.setRunner(mockRunner);
  });

  afterEach(() => {
    GhOperations.resetRunner();
  });

  describe('PRCreateTool', () => {
    let tool: PRCreateTool;

    beforeEach(() => {
      tool = new PRCreateTool();
    });

    it('should have correct definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('pr_create');
      expect(definition.description).toContain('Create a pull request');
      expect(definition.description).toContain('Does not auto-merge');
      expect(definition.parameters.required).toContain('title');
      expect(definition.parameters.required).toContain('body');
    });

    it('should create a pull request', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: 'https://github.com/user/repo/pull/123\nCreated pull request #123',
        stderr: '',
        exitCode: 0,
      });

      const result = await tool.execute(
        {
          title: 'Test PR',
          body: 'This is a test pull request',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.output).toContain('pull request #123');
      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('gh pr create'),
        context.workspaceRoot
      );
      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--title "Test PR"'),
        context.workspaceRoot
      );
    });

    it('should create a draft PR', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: 'Created draft PR #124',
        stderr: '',
        exitCode: 0,
      });

      const result = await tool.execute(
        {
          title: 'Draft PR',
          body: 'Draft description',
          draft: true,
        },
        context
      );

      expect(result.success).toBe(true);
      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--draft'),
        context.workspaceRoot
      );
    });

    it('should create PR with base branch', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: 'Created PR #125',
        stderr: '',
        exitCode: 0,
      });

      const result = await tool.execute(
        {
          title: 'Feature PR',
          body: 'Feature description',
          base: 'develop',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--base "develop"'),
        context.workspaceRoot
      );
    });

    it('should return error for missing title', async () => {
      const result = await tool.execute(
        {
          body: 'Description',
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing or invalid "title" parameter');
    });

    it('should return error for missing body', async () => {
      const result = await tool.execute(
        {
          title: 'Test',
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing or invalid "body" parameter');
    });

    it('should return error when gh is not available', async () => {
      (mockRunner.isAvailable as any).mockResolvedValueOnce(false);

      const result = await tool.execute(
        {
          title: 'Test',
          body: 'Description',
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('GitHub CLI (gh) is not installed');
      expect(result.error).toContain('https://cli.github.com/');
    });

    it('should handle gh command failures', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 1,
      });

      const result = await tool.execute(
        {
          title: 'Test',
          body: 'Description',
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a git repository');
    });

    it('should escape quotes in title and body', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: 'Created PR',
        stderr: '',
        exitCode: 0,
      });

      await tool.execute(
        {
          title: 'Test "quoted" title',
          body: 'Body with "quotes"',
        },
        context
      );

      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('\\"quoted\\"'),
        context.workspaceRoot
      );
    });

    it('should handle network errors', async () => {
      (mockRunner.exec as any).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await tool.execute(
        {
          title: 'Test',
          body: 'Description',
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });
  });

  describe('PRViewTool', () => {
    let tool: PRViewTool;

    beforeEach(() => {
      tool = new PRViewTool();
    });

    it('should have correct definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('pr_view');
      expect(definition.description).toContain('View details');
    });

    it('should view current branch PR', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '{"number":123,"title":"Test PR","state":"OPEN","url":"https://github.com/user/repo/pull/123"}',
        stderr: '',
        exitCode: 0,
      });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Test PR');
      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('gh pr view'),
        context.workspaceRoot
      );
      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--json'),
        context.workspaceRoot
      );
    });

    it('should view specific PR by number', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '{"number":456,"title":"Specific PR"}',
        stderr: '',
        exitCode: 0,
      });

      const result = await tool.execute({ number: '456' }, context);

      expect(result.success).toBe(true);
      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('gh pr view 456'),
        context.workspaceRoot
      );
    });

    it('should open PR in web browser', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const result = await tool.execute({ web: true }, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Opened pull request in web browser');
      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--web'),
        context.workspaceRoot
      );
    });

    it('should return error when gh is not available', async () => {
      (mockRunner.isAvailable as any).mockResolvedValueOnce(false);

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('GitHub CLI (gh) is not installed');
    });

    it('should handle PR not found errors', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'no pull requests found',
        exitCode: 1,
      });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no pull requests found');
    });
  });

  describe('PRListTool', () => {
    let tool: PRListTool;

    beforeEach(() => {
      tool = new PRListTool();
    });

    it('should have correct definition', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('pr_list');
      expect(definition.description).toContain('List pull requests');
    });

    it('should list open PRs by default', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '[{"number":1,"title":"PR 1","state":"OPEN"},{"number":2,"title":"PR 2","state":"OPEN"}]',
        stderr: '',
        exitCode: 0,
      });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('PR 1');
      expect(result.output).toContain('PR 2');
      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--state open'),
        context.workspaceRoot
      );
    });

    it('should list PRs with custom state', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '[]',
        stderr: '',
        exitCode: 0,
      });

      await tool.execute({ state: 'closed' }, context);

      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--state closed'),
        context.workspaceRoot
      );
    });

    it('should list PRs with custom limit', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '[]',
        stderr: '',
        exitCode: 0,
      });

      await tool.execute({ limit: 25 }, context);

      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--limit 25'),
        context.workspaceRoot
      );
    });

    it('should return error when gh is not available', async () => {
      (mockRunner.isAvailable as any).mockResolvedValueOnce(false);

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('GitHub CLI (gh) is not installed');
    });

    it('should handle no PRs found', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.output).toContain('No pull requests found');
    });

    it('should handle gh command errors', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '',
        stderr: 'API rate limit exceeded',
        exitCode: 1,
      });

      const result = await tool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API rate limit exceeded');
    });

    it('should list merged PRs', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '[{"number":10,"title":"Merged PR","state":"MERGED"}]',
        stderr: '',
        exitCode: 0,
      });

      const result = await tool.execute({ state: 'merged' }, context);

      expect(result.success).toBe(true);
      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--state merged'),
        context.workspaceRoot
      );
    });

    it('should list all PRs regardless of state', async () => {
      (mockRunner.exec as any).mockResolvedValueOnce({
        stdout: '[{"number":1,"state":"OPEN"},{"number":2,"state":"CLOSED"}]',
        stderr: '',
        exitCode: 0,
      });

      await tool.execute({ state: 'all' }, context);

      expect(mockRunner.exec).toHaveBeenCalledWith(
        expect.stringContaining('--state all'),
        context.workspaceRoot
      );
    });
  });

  describe('gh availability check', () => {
    it('should detect when gh is installed', async () => {
      (mockRunner.isAvailable as any).mockResolvedValueOnce(true);

      const available = await GhOperations.isAvailable('/test');

      expect(available).toBe(true);
    });

    it('should detect when gh is not installed', async () => {
      (mockRunner.isAvailable as any).mockResolvedValueOnce(false);

      const available = await GhOperations.isAvailable('/test');

      expect(available).toBe(false);
    });
  });
});
