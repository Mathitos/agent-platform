# Loom — Technical Design v0

Companion to frozen [PRD v1](./PRD.md). Decisions here are **engineering proposals** until reviewed.

| Field | Value |
| --- | --- |
| Product | **Loom** (`loom` CLI) |
| Status | Proposed — tech design v0 |
| Notion source | https://app.notion.com/p/3d2422966e8e812ba327d463ed2f09e6 |
| Related ADRs | [001](./adr/001-provider-adapters.md), [002](./adr/002-workflow-schema.md), [003](./adr/003-telemetry-store.md) |

## Stack

- **TypeScript + Node** (npm/pnpm global CLI `loom`)
- Package manager: **pnpm** preferred for monorepo-ready layout
- Platforms: macOS + Linux first-class; Windows via WSL

## Repo layout (proposed)

```text
packages/cli          # loom binary entry
packages/core         # agent loop, tools, memory interfaces
packages/providers    # OpenAI / Cursor / Bionic adapters
packages/workflow     # multi-agent runner, budgets, telemetry
packages/i18n         # EN + PT-BR strings
docs/                 # PRD, architecture, ADRs
```

## Core concepts

1. **ProviderAdapter** — chat + tool-calling; env-based secrets for MVP  
   See [ADR-001](./adr/001-provider-adapters.md).
2. **UserNamespace** — all config/memory under user id (single active user now; namespaced paths from day one).
3. **Session / Run** — persisted state for pause/resume (burn-and-resume when tokens/quota empty).
4. **WorkflowDefinition** — YAML/JSON in repo is source of truth; CLI scaffolds  
   See [ADR-002](./adr/002-workflow-schema.md).
5. **TelemetryEvent** — append-only local store; CLI `status` / `logs` / `report`; portable to a later web dashboard  
   See [ADR-003](./adr/003-telemetry-store.md).

## Permission model

- **Trusted folder roots** → YOLO / full auto (user marks/trusts project paths).
- **Outside trusted folders** → deny or ask (safer default still TBD).

## Multi-agent

- Roles: **builder** / **reviewer** / **supervisor** (+ parallel specialists under supervisor).
- Flagship flow: builder (e.g. OpenAI) → reviewer (Qwen via local Bionic) → supervisor; supervisor may merge when checks pass.
- **Budgets**: tokens/cost, wall-clock, retries, human pause on exhausted retries or configured failure classes.

## Out of scope for this draft

- Deep harness / layered memory architecture polish (**post-1.0**)
- Keychain / encrypted secrets backend (**post-MVP**; env vars only in MVP)
- Native Windows (WSL only for 1.0)

## Next ADRs

| ADR | Topic | Status |
| --- | --- | --- |
| [001](./adr/001-provider-adapters.md) | Provider interface shapes | Proposed |
| [002](./adr/002-workflow-schema.md) | Workflow schema | Proposed |
| [003](./adr/003-telemetry-store.md) | Telemetry store format | Proposed |
| 004 | User config layout | Needed (spike) |

## Next engineering step

**M0 — provider feasibility spike** (Cursor subscription path, OpenAI subscription auth, Bionic smoke test) after this docs PR merges.
