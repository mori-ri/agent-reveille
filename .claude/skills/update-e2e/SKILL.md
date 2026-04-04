---
name: update-e2e
description: "Write or update E2E tests when source code changes. Use when the user says 'テスト追加して', 'テスト更新して', 'テスト書いて', 'add tests', 'update tests', 'write tests for', or asks to add/update/write test coverage for changed code. Also trigger when the user says 'テストが足りない', 'カバレッジ', or wants test code modified."
allowed-tools: Bash(npm run test:e2e *), Bash(npm test *), Bash(npx vitest *), Read, Write, Edit, Glob, Grep, Agent
---

# Update E2E Tests for Reveille

Write or update E2E tests to match source code changes.

## Test Architecture

Reveille has two types of E2E tests:

### 1. CLI Tests (`test/e2e/cli/`)

Spawn `tsx bin/reveille.ts` as a child process and check stdout/stderr/exit code.

**When to use:** Testing the full CLI pipeline — argument parsing, file I/O, output formatting, error handling.

**Template:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runCLI } from "../helpers/cli.js";
import { createTestEnv, type TestEnv } from "../../helpers/setup.js";

describe("CLI <feature>", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("does something", async () => {
    // Create prerequisite tasks if needed
    const addResult = await runCLI(
      ["add", "--name", "Test", "--cmd", "echo hi", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    // Run the command under test
    const result = await runCLI(["<command>", taskId, ...flags], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("expected output");
  });
});
```

**Key points:**
- `runCLI(args, tmpDir)` sets `REVEILLE_HOME` and `REVEILLE_SKIP_LAUNCHCTL=1` automatically
- Extract task IDs from add output with `/\(([a-zA-Z0-9_-]+)\)/`
- Check both `stdout` and `stderr`, plus `exitCode`
- Each test is isolated via `createTestEnv()` temp directory

### 2. Component Tests (`test/e2e/components/`)

Render Ink React components in-process with `ink-testing-library`.

**When to use:** Testing UI rendering, step-by-step wizard navigation, keyboard interactions.

**Template:**

```tsx
import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "ink-testing-library";
import { MyComponent } from "../../../src/commands/mycommand.js";
import { createTask } from "../../../src/lib/tasks.js";
import { createTestEnv, type TestEnv } from "../../helpers/setup.js";

describe("MyComponent", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("renders correctly", () => {
    const { lastFrame } = render(<MyComponent />);
    expect(lastFrame()).toContain("expected text");
  });
});
```

**Keyboard interaction pattern (for multi-step wizards):**

```tsx
// Helper: wait for a frame containing expected content
async function waitFor(
  lastFrame: () => string | undefined,
  condition: (frame: string) => boolean,
  maxWait = 2000,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const frame = lastFrame();
    if (frame && condition(frame)) return frame;
    await new Promise((r) => setTimeout(r, 20));
  }
  return lastFrame() ?? "";
}

// Helper: submit TextInput step and wait for transition
async function submitAndWaitFor(
  stdin: { write: (data: string) => void },
  lastFrame: () => string | undefined,
  expectedContent: string,
): Promise<string> {
  await new Promise((r) => setTimeout(r, 100)); // Let ink register handlers
  stdin.write("\r");
  return waitFor(lastFrame, (f) => f.includes(expectedContent));
}

// Usage in tests:
stdin.write("\r"); // Enter key for TextInput submit
stdin.write("\x1B[B"); // Arrow down for SelectInput
await new Promise((r) => setTimeout(r, 50)); // Delay between arrow keys
stdin.write("\r"); // Enter to confirm selection
```

**Important timing notes:**
- Always `await` between `stdin.write` calls for different steps
- Use `waitFor` to poll for frame changes instead of fixed delays
- Add 100ms delay before writing to a newly mounted TextInput
- Add 50ms delay between consecutive arrow key presses for SelectInput

## Test File Mapping

| Source file | CLI test | Component test |
|-------------|----------|----------------|
| `src/commands/add.tsx` | `cli/lifecycle.test.ts` | - |
| `src/commands/edit.tsx` | `cli/edit.test.ts` | `components/edit.test.tsx` |
| `src/commands/list.tsx` | `cli/lifecycle.test.ts` | `components/list.test.tsx` |
| `src/commands/logs.tsx` | `cli/lifecycle.test.ts` | `components/logs.test.tsx` |
| `src/commands/run.ts` | `cli/execution.test.ts` | - |
| `src/commands/remove.ts` | `cli/lifecycle.test.ts` | - |
| `src/commands/dashboard.tsx` | - | `components/dashboard.test.tsx` |
| `src/commands/enable.ts` | - | - |
| `src/commands/disable.ts` | - | - |
| `src/lib/executor.ts` | `cli/execution.test.ts` | - |
| `bin/reveille.ts` | `cli/errors.test.ts` | - |

## Steps

### 1. Identify what changed

Read the changed source files. Understand the new behavior, modified interfaces, and edge cases.

### 2. Find existing tests

Use the mapping table above. Read the relevant test files to understand current coverage.

### 3. Determine test type

- **Flag-based CLI behavior** (non-interactive) → CLI test
- **UI rendering, wizard steps, keyboard interaction** → Component test
- **Error handling, edge cases** → CLI test (easier to assert stderr/exit code)
- **Both interactive and non-interactive paths** → Both types

### 4. Write tests

Follow the templates above. Test:
- **Happy path**: The new feature works correctly
- **Edge cases**: Empty input, invalid values, boundary conditions
- **Error handling**: Bad input produces correct error messages and non-zero exit
- **Integration**: New feature works with existing features (e.g., edit then list)

### 5. Run and verify

```bash
# Run specific test file
npx vitest run --project e2e <path-to-test>

# Run all tests
npm test
```

If tests fail, read the error output, diagnose the root cause, and fix. Common issues:
- Timing: Add `waitFor` or increase delay for component tests
- Output format change: Update `toContain()` assertions to match new output
- Missing setup: Ensure prerequisite tasks are created before testing

## Conventions

- Test files end in `.test.ts` (CLI) or `.test.tsx` (component)
- Use `describe` for grouping, `it` for individual tests
- Test descriptions should be clear and concise in English
- One assertion focus per test (but multiple `expect` calls are fine)
- Don't test internal implementation details — test observable behavior
- Components must be exported from source files to be testable

## Test Helpers

| Helper | Location | Purpose |
|--------|----------|---------|
| `runCLI(args, tmpDir)` | `test/e2e/helpers/cli.ts` | Spawn CLI process with isolated env |
| `createTestEnv()` | `test/helpers/setup.ts` | Create temp dir with config structure |
| `env.cleanup()` | `test/helpers/setup.ts` | Remove temp dir and restore env vars |

$ARGUMENTS
