# Contributing to Loom

Thank you for your interest in contributing to Loom! This document provides guidelines for developing, testing, and submitting contributions.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Agent Review Gate](#agent-review-gate)

## Development Setup

### Prerequisites

- **Node.js** 18.0.0 or higher
- **pnpm** 8.0.0 or higher

### Installation

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/agent-platform.git
cd agent-platform
```

3. Install dependencies:

```bash
pnpm install
```

4. Build all packages:

```bash
pnpm build
```

5. Run tests to ensure everything is working:

```bash
pnpm test
```

## Project Structure

Loom is a TypeScript/Node.js monorepo using pnpm workspaces:

```
packages/
├── core/          # Core types, interfaces, config, i18n
├── providers/     # Provider implementations (OpenAI, OpenAI-compatible, Cursor stub)
├── tools/         # Tool implementations (files, shell, memory)
├── agent/         # Agent executor (tool loop)
└── cli/           # CLI commands and user interface
```

### Key Conventions

- **Classes with static methods** over module-level helpers
- **User-namespaced config** structure (`~/.loom/users/{userId}/config.json`)
- **Bilingual strings** (EN + PT-BR) from day one
- All user-facing strings must be externalized via `I18n.t()`

## Development Workflow

### Making Changes

1. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following the code style guidelines

3. Add or update tests for your changes

4. Ensure all tests pass:

```bash
pnpm test
```

5. Ensure type checking passes:

```bash
pnpm typecheck
```

6. Build to verify no compilation errors:

```bash
pnpm build
```

### Running the CLI During Development

```bash
# Run the CLI from source
pnpm loom --help
pnpm loom chat "test message"
pnpm loom agent "test with tools"
```

### Running Package-Specific Commands

```bash
# Run tests for a specific package
cd packages/core && pnpm test

# Run type checking for a specific package
cd packages/cli && pnpm typecheck

# Build a specific package
cd packages/providers && pnpm build
```

## Testing

### Test Requirements

- All new features must include tests
- All bug fixes should include regression tests
- Maintain or improve test coverage

### Test Structure

Tests are located in the same directory as the source files with a `.test.ts` suffix:

```
packages/core/src/
├── i18n.ts
├── i18n.test.ts
├── config.ts
└── config.test.ts
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (for a specific package)
cd packages/core && pnpm test -- --watch

# Run tests with coverage
cd packages/core && pnpm test -- --coverage
```

### Writing Tests

- Use **Vitest** as the test framework
- Follow the existing test patterns (see `packages/core/src/i18n.test.ts` for examples)
- Test both success and error cases
- For CLI strings, ensure both EN and PT-BR translations are tested

Example test structure:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyFeature', () => {
  beforeEach(() => {
    // Setup
  });

  describe('Static class design', () => {
    it('should be a class with static methods', () => {
      // Test implementation
    });
  });

  describe('Core functionality', () => {
    it('should handle valid input', () => {
      // Test implementation
    });

    it('should handle invalid input', () => {
      // Test implementation
    });
  });
});
```

## Code Style

### TypeScript Guidelines

- Use **TypeScript** for all code
- Enable strict mode (already configured in `tsconfig.json`)
- Prefer explicit types over `any`
- Use meaningful variable and function names

### Naming Conventions

- **Classes**: `PascalCase` (e.g., `ProviderAdapter`, `I18n`)
- **Methods**: `camelCase` (e.g., `setLocale`, `validatePath`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`)
- **Files**: `kebab-case` (e.g., `file-read.ts`, `openai-compatible.ts`)

### Internationalization (i18n)

All user-facing strings must be internationalized:

1. Add strings to `packages/core/src/i18n.ts` in both `en` and `pt-BR` sections
2. Use `I18n.t()` to access strings:

```typescript
const t = I18n.t.bind(I18n);
console.log(t('cli.description'));
```

3. For dynamic strings, use functions:

```typescript
// In i18n.ts
errors: {
  fileNotFound: (path: string) => `File not found: ${path}`,
}

// Usage
const t = I18n.t.bind(I18n);
const errorFn = t('errors.fileNotFound');
console.error(errorFn('/path/to/file'));
```

4. Add tests for all new i18n strings in `packages/core/src/i18n.test.ts`

### Error Handling

- Use descriptive error messages
- Catch and handle errors appropriately
- Return error information in tool execution results
- Use i18n for all user-facing error messages

## Pull Request Process

### Before Submitting

1. Ensure all tests pass: `pnpm test`
2. Ensure type checking passes: `pnpm typecheck`
3. Ensure the build succeeds: `pnpm build`
4. Update documentation if needed
5. Add or update tests for your changes

### Submitting a PR

1. Push your branch to your fork:

```bash
git push origin feature/your-feature-name
```

2. Open a pull request against the `main` branch

3. Fill out the PR template with:
   - Clear description of changes
   - Link to related issues (if any)
   - Test coverage information
   - Risk assessment (LOW/MED/HIGH)

4. Create the PR as **draft** initially

### PR Guidelines

- **One feature per PR** — keep changes focused and atomic
- **Descriptive commit messages** — explain what and why
- **Update documentation** — if you change behavior, update docs
- **Add tests** — all code changes should include tests
- **Follow existing patterns** — maintain consistency with the codebase

## Agent Review Gate

Loom uses an agent-based code review workflow. See [docs/REVIEW_GATE.md](docs/REVIEW_GATE.md) for complete details.

### Review Process Summary

1. **Builder Agent** (or human) implements changes and opens a PR as draft
2. **Independent Reviewer** (separate agent) reviews the PR against:
   - Frozen PRD (`docs/PRD.md`)
   - ADRs (`docs/adr/*`)
   - Code quality and test coverage
3. **Risk Tier Assignment:**
   - **LOW** — Docs-only, trivial changes, smoke tests
   - **MED** — Standard feature work, refactoring with tests
   - **HIGH** — Breaking changes, security-sensitive, architectural shifts
4. **CI Checks** run after review approval
5. **Ready for Merge** when both reviewer and CI approve
6. **Merge** by supervisor agent or human

### What Reviewers Check

- ✅ **PRD Alignment** — Does implementation match requirements?
- ✅ **ADR Compliance** — Does code follow architectural decisions?
- ✅ **Test Coverage** — Are changes adequately tested?
- ✅ **Code Quality** — Clean, maintainable, follows conventions?
- ✅ **i18n Coverage** — Are user-facing strings internationalized?
- ✅ **Security** — No obvious security concerns?

### Review Comment Format

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

## Getting Help

- **Issues** — Open an issue on GitHub for bugs or feature requests
- **Discussions** — Use GitHub Discussions for questions
- **PRD** — See [docs/PRD.md](docs/PRD.md) for product requirements
- **Architecture** — See [docs/architecture.md](docs/architecture.md) for technical design

## Code of Conduct

- Be respectful and constructive
- Focus on the code, not the person
- Assume good intentions
- Welcome newcomers and help them learn

## License

By contributing to Loom, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Loom! 🧵
