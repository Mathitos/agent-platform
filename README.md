# Loom

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Loom** weaves many agents and model providers into one CLI workflow.

> Status: M3 complete — Agent tools with MCP, Git, and PR support. Bilingual CLI (EN + PT-BR).

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+ (or npm 9+)

### Global Installation (Recommended)

Once published to npm, install globally for the `loom` command on your PATH:

```bash
# Using npm
npm install -g @loom/cli

# Or using pnpm
pnpm add -g @loom/cli

# Verify installation
loom --version
loom --help
```

### Installation from Source

For development or testing the latest changes:

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

If installed globally, use `loom` directly. If running from source, use `pnpm loom`.

```bash
# Show help
loom --help

# Show version
loom version

# Single-turn chat
loom chat "What is TypeScript?"

# Interactive chat REPL
loom chat

# Agent with tools (files, shell, memory, MCP, git)
loom agent "Read the README and summarize it"

# Interactive agent REPL
loom agent

# Git operations
loom git status
loom git diff --staged
loom git commit "feat: add new feature"
loom git branch-info

# Multi-agent workflow (M5)
loom workflow init my-workflow
loom workflow run .loom/my-workflow.json
loom workflow status <runId>
loom workflow logs <runId>
loom workflow report <runId>
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
# Start Bionic (example with docker)
docker run -d -p 11434:11434 ghcr.io/bionic-gpt/bionic-gpt:latest

# Configure Loom to use Bionic
export OPENAI_COMPATIBLE_BASE_URL="http://localhost:11434/v1"
export OPENAI_COMPATIBLE_API_KEY="bionic-local-key"

# Run agent with local AI
pnpm loom agent "analyze this code"
```

### MCP (Model Context Protocol) Configuration

MCP connector support is planned for future milestones. Configuration will be documented here when available.

### Cursor Provider

The Cursor provider is **BLOCKED** pending official API availability:

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

M2 reads configuration from environment variables only. File-based config will be implemented in later milestones.

### Internationalization (i18n)

Loom supports **bilingual CLI output** from day one:

- **English** (default)
- **Brazilian Portuguese** (`pt-BR`)

The locale can be set via environment variable (future) or defaults to `en`. All user-facing strings are externalized and translated.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guidelines.

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

## Milestones

- **M0** — Spike: Cursor/OpenAI/Bionic feasibility ✅
- **M1** — Skeleton CLI: provider interface, OpenAI-compat, bilingual strings ✅
- **M2** — Harness core: agent with tools (files, shell, memory) ✅
- **M3** — MCP + git/PR helpers ✅
- **M4** — OSS polish + i18n audit (current)

See the [Product Requirements Document](docs/PRD.md) for the full roadmap and [CHANGELOG](docs/CHANGELOG.md) for version history.

## Contributing

Loom is open source under the MIT license. Contributions welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:

- Development setup
- Code style and conventions
- Testing requirements
- Pull request process
- Agent review gate

## Documentation

- [Product Requirements Document (v1 FROZEN)](docs/PRD.md)
- [Technical Design v0](docs/architecture.md)
- [Changelog](docs/CHANGELOG.md)
- [Review Gate Process](docs/REVIEW_GATE.md)
- [MCP Configuration Guide](docs/mcp-configuration.md)
- [ADR-001 — Provider adapters](docs/adr/001-provider-adapters.md)
- [ADR-002 — Workflow schema](docs/adr/002-workflow-schema.md)
- [ADR-003 — Telemetry store](docs/adr/003-telemetry-store.md)

## License

[MIT](LICENSE) © Matheus Anzzulin

## Resources

- [GitHub Repository](https://github.com/Mathitos/agent-platform)
- [Contributing Guidelines](CONTRIBUTING.md)

<!-- loom cloud-agent ok -->
