# ADR-002 — Workflow schema

| Field | Value |
| --- | --- |
| Status | **Proposed** — refine when skeleton lands |
| Date | 2026-09-05 |
| Notion source | https://app.notion.com/p/3d2422966e8e81929976c06664dc0a47 |
| Related | [Technical Design v0](../architecture.md), [PRD](../PRD.md) |

## Context

Loom's flagship use case is multi-agent **build → review → supervise**. The workflow definition file in the repo is the **source of truth**; the CLI scaffolds it. Guardrails (budgets, retries, human pause) and pause/resume across sessions must be expressible in that file plus persisted run state.

## Decision (proposed)

YAML/JSON workflow documents with:

| Field | Purpose |
| --- | --- |
| `name` | Human-readable workflow id |
| `budgets` | `tokens`, `cost`, `wallClockMs`, `retries` |
| `agents[]` | `id`, `role`, `provider`, `model` |
| `steps[]` | `id`, `agent`, `needs[]`, `action` |
| `onFailure` | `retry` \| `pauseHuman` \| `abort` |

### Example (illustrative)

```yaml
name: multi-agent-pr
budgets:
  tokens: 500000
  cost: 25.0
  wallClockMs: 7200000
  retries: 2
agents:
  - id: builder
    role: builder
    provider: openai
    model: gpt-5
  - id: reviewer
    role: reviewer
    provider: bionic
    model: qwen
  - id: supervisor
    role: supervisor
    provider: openai
    model: gpt-5
steps:
  - id: build-pr
    agent: builder
    needs: []
    action: implement_and_open_pr
  - id: review-pr
    agent: reviewer
    needs: [build-pr]
    action: review_diff_and_tests
  - id: supervise
    agent: supervisor
    needs: [review-pr]
    action: gate_merge
onFailure: pauseHuman
```

Exact `action` vocabulary and parallel-step syntax land with the workflow package skeleton (`packages/workflow`).

## Consequences

- CLI scaffold must emit a valid starter file matching this shape.
- Runner enforces budgets and `onFailure`; run state (for pause/resume) is owned by the telemetry/run store ([ADR-003](./003-telemetry-store.md)).

## Status

Proposed — refine when skeleton lands.
