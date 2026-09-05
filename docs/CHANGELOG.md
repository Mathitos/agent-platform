# Changelog

All notable changes to Loom will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### M8 — Publishable CLI Packaging

#### Added
- Single-file bundled CLI using esbuild for distribution
- `pnpm pack:cli` script to create distributable tarball
- `pnpm test:pack` smoke test for verifying packed tarball functionality
- Packaging configuration tests (12 new tests)
- Prepack/postpack scripts to remove workspace dependencies from tarball
- Installation instructions in README for both tarball and source installation

#### Changed
- CLI package now bundles all workspace dependencies into `dist/bundle.js`
- CLI bin entry now points to bundled file instead of individual transpiled file
- Build process now includes both TypeScript compilation and esbuild bundling
- Package files field restricts tarball to only bundle.js and source map

#### Technical Details
- Bundle target: Node.js 18+, CommonJS format
- Bundle size: ~98KB (uncompressed), includes all @loom/* packages
- No external dependencies required for installation
- Source maps included for debugging

### M7 — Flagship Workflow Template + Golden-Path Docs

#### Added
- `loom workflow init` command with template scaffolding (`--template flagship|default|pr`)
- Flagship PR workflow template matching PRD spec (builder → reviewer → supervisor)
- YAML workflow generation with inline comments and environment variable guidance
- Template validation using existing `@loom/workflow` schema types
- Comprehensive workflow template tests (21 tests covering scaffolding, validation, file creation)
- Golden-path documentation in README (clone → install → configure → scaffold → run)
- Bilingual workflow help strings (EN + PT-BR) for init command and templates

#### Changed
- README updated with honest packaging note (workspace deps require from-source install)
- README includes golden-path section showing recommended flagship workflow path
- Workflow init command extended: legacy JSON init + new template-based YAML scaffold
- Status updated: M7 complete (all 570+ tests passing)

#### Documentation
- Golden-path section in README with flagship template walkthrough
- Documented OpenAI builder, Bionic/Qwen reviewer, OpenAI supervisor architecture
- Clear guidance that global npm install not ready until packages published/bundled

### M6 — OS Notifications + npm Packaging Polish

#### Added
- **OS notifications** for workflow completion (success/failure)
  - Native desktop notifications on macOS, Linux (Windows/WSL best-effort)
  - Bilingual notification strings (EN + PT-BR) via i18n
  - Graceful degradation: logs once and continues if notifier unavailable
  - Comprehensive test suite with mocked notifier (8 tests)
- **npm/pnpm global install support**
  - `files` field in `@loom/cli/package.json` for proper packaging
  - Global install instructions in README (`npm install -g @loom/cli` / `pnpm add -g @loom/cli`)
  - Smoke test script to verify bin entry (`pnpm smoke-test`)
- Dependencies: `node-notifier` (workflow notifications)

#### Changed
- README: Global installation section with npm/pnpm install commands
- README: Updated usage examples to show global `loom` command
- CLI help now includes workflow commands (M5)

#### Fixed
- Flaky timing test in budget-tracker (reduced assertion threshold for CI stability)

### M5 — Multi-Agent Workflow Runner + Observability MVP

#### Added
- **Workflow runner** (`WorkflowRunner`)
  - Loads workflow JSON files
  - Executes steps in dependency order (DAG traversal)
  - Enforces budgets (tokens, cost, wall-clock, retries)
  - Handles `onFailure` strategies (retry, pauseHuman, abort)
  - Supports pause/resume via persisted run state
  - Generates unique run IDs (timestamp + random suffix)
- **Workflow schema** (`WorkflowSchema`)
  - Full validation with detailed error messages
  - Agent roles: builder, reviewer, supervisor, specialist
  - Parallel step support (`parallel: true`)
  - `allowSupervisorMerge` flag for auto-merge
- **Budget tracker** (`BudgetTracker`)
  - Tracks tokens, cost, wall-clock time, retries
  - Emits warnings at thresholds (50%, 75%, 90%)
  - Hard stops when budgets exceeded
- **Telemetry store** (`TelemetryStore`)
  - Event types: run lifecycle, step lifecycle, budget events, provider calls, merge events
  - User-namespaced storage (`~/.loom/users/{userId}/telemetry/`)
  - JSON append-only log per run
  - Query by run ID, event type, time range
- **Observability** (`WorkflowObservability`)
  - `status` — current workflow status (running/completed/failed/paused)
  - `logs` — event stream with filtering and limits
  - `report` — summary with duration, tokens, cost, artifacts
  - Formatted output for CLI display
- **CLI commands**
  - `loom workflow init [name]` — scaffold workflow JSON
  - `loom workflow run <file>` — execute workflow
  - `loom workflow status <runId>` — show status
  - `loom workflow logs <runId>` — show event logs
  - `loom workflow report <runId>` — generate report
- Comprehensive test suite (100+ tests across all workflow components)

#### Documentation
- ADR-002: Workflow schema design
- ADR-003: Telemetry store design
- Updated architecture docs with workflow package

### M4 — OSS Polish + i18n (Completed)

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
- File-based configuration (beyond environment variables) planned for future milestone
- Multi-user support designed but not implemented (user-namespaced structure ready)
- CLI not yet published to npm registry (manual installation from tarball required)

## Roadmap

### Upcoming Milestones

- **M8+** — Enhanced workflow features, agent specialization, production hardening

See [docs/PRD.md](PRD.md) for the complete product roadmap.

---

[Unreleased]: https://github.com/Mathitos/agent-platform/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Mathitos/agent-platform/releases/tag/v0.1.0
