# Review Gate — Loom PR Workflow

This document describes the code review and merge workflow for the Loom agent-platform repository.

## Workflow Ladder

```
Builder Agent → Independent Reviewer → CI → Ready for Merge → Merge
```

### 1. Builder Agent (Implementation)

- A cloud agent (or human developer) implements changes on a feature branch
- Opens a pull request against `main`
- Commits must pass basic hygiene (valid syntax, follows project conventions)
- PR should be created as **draft** initially

### 2. Independent Reviewer (Code Review)

- An **independent code reviewer** (separate agent, not the builder) reviews the PR
- Reviewer checks changes against:
  - **Frozen PRD** (`docs/PRD.md`) — does implementation match requirements?
  - **ADRs** (`docs/adr/*`) — does code follow architectural decisions?
  - Code quality, test coverage, security concerns
- Reviewer assigns **Risk Tier:**
  - **LOW** — Docs-only, trivial changes, smoke tests with no functional impact
  - **MED** — Standard feature work, refactoring with existing test coverage
  - **HIGH** — Breaking changes, security-sensitive code, architectural shifts
- Reviewer posts verdict:
  - **APPROVE** — changes are acceptable, may proceed to CI
  - **REQUEST_CHANGES** — issues must be addressed before merge
- Review includes bullet findings (or "no findings" if clean)

**Important:** Matheus does not manually review diffs in most cases. The independent reviewer agent acts as the primary code quality gate.

### 3. CI (Continuous Integration)

Once approved by the independent reviewer:

- PR is marked **Ready for Review** (no longer draft)
- CI checks run (currently: linting, tests, build validation as configured)
- All checks must pass green before merge

### 4. Ready for Merge

When both conditions are met:

- ✅ Independent reviewer APPROVED
- ✅ CI checks PASSED

The PR enters "Ready for Merge" state.

### 5. Merge

- **Supervisor agent** may auto-merge when checks pass (per PRD requirement: "Supervisor auto-merge when checks pass")
- **OR** human (Matheus) merges manually if preferred for that PR
- Merge strategy: squash or rebase as appropriate (default: squash for feature branches)

## Review Comment Format

Independent reviewer comments follow this structure:

```markdown
## Independent Code Review

**Risk Tier:** LOW | MED | HIGH

**Verdict:** APPROVE | REQUEST_CHANGES

**Findings:**

- Bullet findings here
- Or "no findings" if clean

**PRD/ADR Alignment:** [Check summary]

**Notes:** [Additional context]
```

## Process Notes

- Builder agents should **NOT** implement fixes based on review feedback in the same PR stream — create a follow-up PR or amend the current branch
- Independent reviewers do **NOT** merge PRs; only post reviews
- Prefer judgment over automation: docs-only and trivial smoke tests = LOW risk if accurate
- Frozen PRD v1 (`docs/PRD.md`) is the source of truth for requirements
- ADRs marked "Proposed" are reviewed as proposed designs; ADRs marked "Accepted" are binding

## Benefits

1. **Consistency** — Every PR gets independent review against requirements
2. **Velocity** — Builder and reviewer can be parallel agents optimized for different tasks
3. **Quality** — Reviewer specializes in PRD/ADR compliance, security, architecture
4. **Auditability** — Clear review trail for every change
5. **Delegation** — Matheus delegates detailed diff review to agents while retaining merge control
