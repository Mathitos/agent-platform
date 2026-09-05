# Changelog

All notable changes to Loom will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### M4 — OSS Polish + i18n (In Progress)

#### Added
- Comprehensive i18n coverage for all M2/M3 CLI strings (agent command, tool errors)
- `CONTRIBUTING.md` with development guidelines, testing requirements, and PR process
- MIT license badge in README
- Expanded i18n test suite (94 tests in core package)
- Documentation improvements: Bionic example, MCP config placeholder, bilingual note

#### Changed
- Updated README with clearer installation instructions and milestone status
- Enhanced agent command help text with bilingual support
- All tool error messages now use i18n (file tools, shell, permissions)

## [0.1.0] - 2026-09-05

### M2 — Harness Core (Agent Tools)

#### Added
- `loom agent` command for running agents with tools
- Agent executor with tool loop support
- Tool implementations:
  - `read_file` — Read files from filesystem
  - `write_file` — Write files to filesystem
  - `execute_shell` — Execute shell commands
  - Memory persistence (store/retrieve key-value pairs)
- Path permission checker (YOLO mode within workspace root)
- Comprehensive test suite for all tools
- Agent integration tests
- Interactive and single-turn agent modes

#### Changed
- Extended i18n strings for agent-specific UI
- Updated CLI help to include agent command

### M1 — Skeleton CLI

#### Added
- TypeScript/Node.js monorepo with pnpm workspaces
- Core packages:
  - `@loom/core` — Types, interfaces, config, i18n
  - `@loom/providers` — Provider implementations
  - `@loom/cli` — CLI commands and UI
- `loom` CLI with commands:
  - `loom chat` — Interactive chat REPL
  - `loom version` — Show version
  - `loom --help` — Show help
- Provider adapter interface (`ProviderAdapter`)
- Provider implementations:
  - OpenAI official API provider
  - OpenAI-compatible provider (supports Bionic, LM Studio)
  - Cursor provider stub (blocked with clear error message)
- Bilingual i18n system (EN + PT-BR)
- User-namespaced config structure
- Environment variable-based configuration
- Comprehensive test suite (197 tests passing)
- GitHub Actions CI (install, typecheck, build, test)

#### Documentation
- Product Requirements Document (PRD v1 FROZEN)
- Technical design v0
- ADRs (Architectural Decision Records):
  - ADR-001: Provider adapters
  - ADR-002: Workflow schema
  - ADR-003: Telemetry store
- Review gate process documentation
- MIT LICENSE

### M0 — Provider Feasibility Spike

#### Investigated
- OpenAI API integration (✅ feasible via official API)
- Cursor subscription tokens (❌ blocked — no official API)
- Bionic local AI (✅ feasible via OpenAI-compatible endpoint)

#### Decisions
- Use OpenAI official API for cloud models
- Block Cursor provider until official API is available
- Support OpenAI-compatible endpoints for local AI (Bionic, LM Studio)
- Use environment variables for provider credentials in MVP

## Release Notes

### Version 0.1.0 — Initial Release

Loom is a CLI agent platform that weaves multiple model providers into one workflow. This initial release includes:

- **Multi-provider support** — OpenAI official API and OpenAI-compatible providers (Bionic, LM Studio)
- **Agent tools** — File operations (read/write), shell commands, and memory persistence
- **Bilingual CLI** — Full EN + PT-BR support for all user-facing strings
- **Type-safe** — Written in TypeScript with strict mode enabled
- **Well-tested** — 197 tests across all packages
- **Developer-friendly** — Monorepo with pnpm workspaces, comprehensive documentation

### Known Limitations

- Cursor provider is blocked pending official API availability
- MCP (Model Context Protocol) connectors planned for future milestone
- Git/PR helpers planned for future milestone
- File-based configuration (beyond environment variables) planned for future milestone
- Multi-user support designed but not implemented (user-namespaced structure ready)

## Roadmap

### Upcoming Milestones

- **M3** — MCP + git/PR helpers
- **M4** — OSS polish + i18n audit (in progress)
- **M5+** — Multi-agent workflow runner, observability, supervisor auto-merge

See [docs/PRD.md](PRD.md) for the complete product roadmap.

---

[Unreleased]: https://github.com/Mathitos/agent-platform/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Mathitos/agent-platform/releases/tag/v0.1.0
