# ADR-003 — Telemetry store

| Field | Value |
| --- | --- |
| Status | **Proposed** |
| Date | 2026-09-05 |
| Related | [Technical Design v0](../architecture.md), [PRD](../PRD.md), [ADR-002](./002-workflow-schema.md) |

## Context

MVP observability is CLI-first (`loom status` / `loom logs` / `loom report`), but the architecture must stay **portable to a later web dashboard**. Operators need workflow graph/step status, tokens, latency, provider/model per role, and artifacts. Workflows must **pause/resume across sessions** with persisted run state (burn-and-resume when subscription tokens are exhausted).

## Decision (proposed)

1. **Append-only local event log** of `TelemetryEvent` records (JSON Lines or equivalent), scoped under the active **UserNamespace**.
2. Events cover at least: run lifecycle, step start/end, token/cost usage, provider/model used, retries, human pause/resume, artifacts (e.g. PR URL), failures.
3. **CLI** is a thin reader/aggregator over the same store:
   - `status` — current run graph + budgets remaining
   - `logs` — filtered event stream
   - `report` — rollup (tokens, time, outcomes)
4. **Run state** (active step, pause reason, budget counters) is persisted alongside the event log so a stopped CLI can resume the same run later.
5. Design the store API so a future web dashboard reads the **same event schema** (no CLI-only coupling). Remote sync is out of scope for MVP; default remains local-only.

### Sketch (illustrative)

```typescript
interface TelemetryEvent {
  readonly id: string;
  readonly runId: string;
  readonly ts: string; // ISO-8601
  readonly type: string;
  readonly payload: Record<string, unknown>;
}

class TelemetryStore {
  static append(event: TelemetryEvent): void {
    /* append-only write */
  }

  static listByRun(runId: string): TelemetryEvent[] {
    return [];
  }
}
```

Exact on-disk paths and retention policy are deferred to the user-config spike (ADR-004).

## Consequences

- Workflow runner must emit events for every step transition and budget tick.
- Pause/resume is a first-class run state, not only a log annotation.
- Dashboard work later should consume this store, not invent a parallel schema.

## Status

Proposed — refine with M1 skeleton and CLI observability surface.
