---
name: e2e
description: "Run E2E tests for the reveille project and report results. Use this skill whenever the user mentions E2E tests, wants to run tests, says 'テスト実行', 'テストを走らせて', 'run e2e', 'run tests', or wants to verify that the CLI or components work correctly. Also trigger when the user asks to check if recent changes broke anything."
allowed-tools: Bash(npm run test:e2e *), Bash(npm test *), Bash(npx vitest *), Read, Glob, Grep
---

# E2E Test Runner for Reveille

Run and analyze end-to-end tests for the reveille CLI tool.

## Test Architecture

Reveille's E2E tests use two complementary approaches:

1. **Component tests** (`test/e2e/components/`) — Use `ink-testing-library` to render Ink React components in-process. Fast, tests UI rendering and interactive behavior directly.
   - `list.test.tsx` — TaskList component (empty state, table rendering, headers)
   - `logs.test.tsx` — ExecutionList component (empty state, execution details, status)
   - `dashboard.test.tsx` — Dashboard component (empty state, task display, detail panel)

2. **CLI tests** (`test/e2e/cli/`) — Spawn `tsx bin/reveille.ts` as a child process. Tests the full CLI pipeline from argument parsing through file I/O.
   - `lifecycle.test.ts` — Happy path: add → list → run → logs → remove
   - `errors.test.ts` — Error handling: unknown command, missing ID, nonexistent task, help, version
   - `execution.test.ts` — Task execution: success, failure, log file output

### Test Isolation

Tests are isolated from the user's real data via environment variables:
- `REVEILLE_HOME` — Redirects all file paths to a temporary directory
- `REVEILLE_SKIP_LAUNCHCTL` — Skips `launchctl load/unload` calls

These are set automatically by the test helpers in `test/e2e/helpers/`.

## How to Run

Execute from the project root (`/Users/add/Github/agent-reveille`):

```bash
# Run E2E tests only
npm run test:e2e

# Run all tests (unit + E2E)
npm test

# Run a specific test file
npx vitest run --project e2e test/e2e/cli/lifecycle.test.ts
```

## Steps

1. Run `npm run test:e2e` and capture the output
2. Parse the results:
   - Count passed/failed tests and test files
   - If all pass, report a brief success summary
   - If any fail, proceed to diagnosis
3. For each failing test:
   - Read the failing test file to understand what it asserts
   - Read the relevant source file that the test exercises
   - Identify the root cause (assertion mismatch, changed output format, broken logic, etc.)
4. Report findings to the user with:
   - Overall pass/fail count
   - For failures: test name, what it expected vs. what happened, and a suggested fix

## Mapping Tests to Source Files

| Test file | Tests | Source files |
|-----------|-------|-------------|
| `components/list.test.tsx` | TaskList rendering | `src/commands/list.tsx` |
| `components/logs.test.tsx` | ExecutionList rendering | `src/commands/logs.tsx` |
| `components/dashboard.test.tsx` | Dashboard rendering | `src/commands/dashboard.tsx` |
| `cli/lifecycle.test.ts` | Full CLI workflow | `bin/reveille.ts`, `src/commands/add.tsx`, `src/commands/run.ts`, `src/commands/remove.ts`, `src/commands/list.tsx`, `src/commands/logs.tsx` |
| `cli/errors.test.ts` | Error handling | `bin/reveille.ts`, `src/commands/run.ts`, `src/commands/remove.ts` |
| `cli/execution.test.ts` | Task execution | `src/commands/run.ts`, `src/lib/executor.ts` |

$ARGUMENTS
