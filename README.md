# Loom

**Loom** weaves many agents and model providers into one CLI workflow.

> Status: M3 — Agent tools with MCP, Git, and PR support.

## Docs

- [Product Requirements Document (v1 FROZEN)](docs/PRD.md)
- [Technical Design v0](docs/architecture.md)
- [MCP Configuration Guide](docs/mcp-configuration.md)
- [ADR-001 — Provider adapters](docs/adr/001-provider-adapters.md)
- [ADR-002 — Workflow schema](docs/adr/002-workflow-schema.md)
- [ADR-003 — Telemetry store](docs/adr/003-telemetry-store.md)

## Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+

### Installation (Local Development)

```bash
# Clone the repository
git clone https://github.com/Mathitos/agent-platform.git
cd agent-platform

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the CLI
pnpm loom --help
```

### Usage

```bash
# Show help
pnpm loom --help

# Show version
pnpm loom version

# Single-turn chat
pnpm loom chat "What is TypeScript?"

# Interactive REPL
pnpm loom chat

# Agent with tools
pnpm loom agent "Read the README and summarize it"

# Git operations
pnpm loom git status
pnpm loom git diff --staged
pnpm loom git commit "feat: add new feature"
pnpm loom git branch-info
```

## Configuration

### Environment Variables

Loom reads provider credentials from environment variables:

#### OpenAI Official API

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4"  # Optional, defaults to gpt-3.5-turbo
```

#### OpenAI-Compatible Providers (Bionic, LM Studio)

```bash
export OPENAI_COMPATIBLE_BASE_URL="http://localhost:1234"
export OPENAI_COMPATIBLE_API_KEY="your-key"
export OPENAI_COMPATIBLE_MODEL="local-model"  # Optional
```

### Example: Using Bionic

[Bionic](https://bionicgpt.com/) provides a local OpenAI-compatible API:

```bash
# Start Bionic (example)
# ... follow Bionic setup instructions ...

# Configure Loom to use Bionic
export OPENAI_COMPATIBLE_BASE_URL="http://localhost:11434/v1"
export OPENAI_COMPATIBLE_API_KEY="bionic-local-key"

# Run chat
pnpm loom chat "Hello from local AI!"
```

### Cursor Provider

The Cursor provider is **BLOCKED** in M1 per M0 findings:

- No documented official API for external access to Cursor subscription tokens
- Attempting to use it will show a clear error message
- **Fallback:** Use `OPENAI_API_KEY` or configure an OpenAI-compatible provider (Bionic/LM Studio)

This is an intentional design decision documented in the M0 spike.

## Architecture

Loom is a TypeScript/Node.js monorepo using pnpm workspaces:

```
packages/
├── core/          # Core types, interfaces, config, i18n
├── providers/     # Provider implementations (OpenAI, OpenAI-compatible, Cursor stub)
├── tools/         # Tool implementations (file, shell, memory, MCP, git, PR)
├── agent/         # AgentExecutor with tool loop
└── cli/           # CLI commands and user interface
```

### Provider Adapter Interface

All providers implement the `ProviderAdapter` abstract class:

```typescript
abstract class ProviderAdapter {
  abstract chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  abstract getName(): string;
}
```

### User-Namespaced Config

Loom uses user-namespaced configuration from day one to support future multi-user scenarios:

- User configs: `~/.loom/users/{userId}/config.json`
- Project configs: `.loom/config.json` (in project root)
- Default user ID: `default`

M1 reads configuration from environment variables only. File-based config will be implemented in later milestones.

### Internationalization (i18n)

Loom supports bilingual CLI output from day one:

- **English** (default)
- **Brazilian Portuguese** (`pt-BR`)

Set locale in user config (future) or defaults to `en`.

## Development

### Monorepo Structure

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Type check all packages
pnpm typecheck

# Run all tests
pnpm test

# Run CLI in development
pnpm loom
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/core && pnpm test
cd packages/providers && pnpm test
```

### Testing Without Live API Keys

The test suite includes unit tests that verify provider behavior without making live API calls:

1. **Request Building:** Tests verify that OpenAI-compatible providers correctly format requests
2. **Config Validation:** Tests ensure proper error handling for missing credentials
3. **Cursor Stub:** Tests confirm the Cursor provider properly blocks with localized error messages

Run the tests to verify the implementation:

```bash
pnpm test
```

No API keys are required to run the test suite.

## M1 Goals (Completed)

- [x] TypeScript/Node monorepo with pnpm workspaces
- [x] Packages: `cli`, `core`, `providers`
- [x] `loom` CLI with `--help`, `version`, `chat` commands
- [x] ProviderAdapter interface
- [x] OpenAI-compatible HTTP provider (supports Bionic/LM Studio)
- [x] OpenAI official API provider
- [x] Cursor provider stub (errors with clear blocked message)
- [x] User-namespaced config structure
- [x] Secrets from environment variables only
- [x] Bilingual strings (EN + PT-BR)
- [x] Basic CI: GitHub Actions (install, typecheck, test)
- [x] Classes with static functions over module-level helpers
- [x] Tests demonstrating correct request building

## M2 Goals (Completed)

- [x] Agent package with tool execution loop
- [x] File read/write tools with permission checking
- [x] Shell command execution tool
- [x] Memory persistence tool (user-namespaced)
- [x] Tool registry in AgentExecutor
- [x] Multi-iteration agent loop with tool calls
- [x] Comprehensive test coverage

## M3 Goals (Completed)

- [x] **MCP Connector Support**: Connect to MCP servers via stdio/HTTP
  - List tools from MCP servers (`mcp_list_tools`)
  - Invoke MCP tools (`mcp_call_tool`)
  - Support for multiple concurrent MCP servers
  - Comprehensive tests with mock transport
- [x] **Git Helper Tools**: Core git operations
  - `git_status`: Show working tree status
  - `git_diff`: View changes (working/staged, specific files)
  - `git_commit`: Commit changes (no force push)
  - `git_branch_info`: Branch information and tracking
  - Injectable runner for testing
  - Integration tests with real temp repos
- [x] **PR Helper Tools**: GitHub integration via gh CLI
  - `pr_create`: Create pull requests (no auto-merge)
  - `pr_view`: View PR details or open in browser
  - `pr_list`: List PRs by state (open/closed/merged/all)
  - Graceful error when gh CLI unavailable
  - Mock gh invocations in tests
- [x] **Tool Registry Integration**: All tools wired into AgentExecutor
  - Optional MCP server configuration
  - Git/PR tools enabled by default
  - Proper cleanup on agent shutdown
- [x] **CLI Commands**: Direct CLI access to git operations
  - `loom git status`
  - `loom git diff [--staged] [files...]`
  - `loom git commit <message> [files...]`
  - `loom git branch-info`
- [x] **Documentation**: MCP configuration guide
  - User-namespaced config at `~/.loom/users/{userId}/mcp-servers.json`
  - Stdio and HTTP transport examples
  - Security best practices
  - Official MCP server examples

## Next Steps (M4+)

M4 will focus on polish and OSS readiness:

- i18n polish for all new features
- Enhanced error messages and user feedback
- Performance optimization
- Advanced workflow composition
- OSS launch preparation

See the [Product Requirements Document](docs/PRD.md) for full roadmap.

## Contributing

Loom is open source under the MIT license. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure `pnpm typecheck` and `pnpm test` pass
5. Submit a pull request

## License

[MIT](LICENSE) © Matheus Anzzulin

## Resources

- [Product Requirements Document](docs/PRD.md)
- [GitHub Repository](https://github.com/Mathitos/agent-platform)

<!-- loom cloud-agent ok -->
