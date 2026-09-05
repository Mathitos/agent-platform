# Loom

**Loom** weaves many agents and model providers into one CLI workflow.

> Status: M1 skeleton — basic CLI with provider adapters.

## Quick Start

<<<<<<< HEAD
- [Product Requirements Document (v1 FROZEN)](docs/PRD.md)
- [Technical Design v0](docs/architecture.md)
- [ADR-001 — Provider adapters](docs/adr/001-provider-adapters.md)
- [ADR-002 — Workflow schema](docs/adr/002-workflow-schema.md)
- [ADR-003 — Telemetry store](docs/adr/003-telemetry-store.md)
=======
### Prerequisites
>>>>>>> ffe2853 (feat: M1 skeleton implementation)

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

## Next Steps (M2+)

M2 will focus on the harness core:

- File read/write tools
- Shell command execution
- Memory persistence
- Basic tool loop

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

<<<<<<< HEAD
<!-- loom cloud-agent ok -->
=======
## Resources

- [Product Requirements Document](docs/PRD.md)
- [GitHub Repository](https://github.com/Mathitos/agent-platform)
>>>>>>> ffe2853 (feat: M1 skeleton implementation)
