# test/ — Testing Conventions

## TDD Required

新機能は先にテストを書き、失敗を確認してから実装する (Red → Green → Refactor)。

## Structure

```
test/
├── lib/           # Unit tests (mirror src/lib/)
├── utils/         # Unit tests (mirror src/utils/)
├── e2e/
│   ├── cli/       # CLI process tests (spawn real CLI)
│   ├── components/# Ink component tests (in-process render)
│   └── helpers/   # Test utilities (runCLI, etc.)
└── helpers/       # Shared test setup (createTestEnv)
```

Vitest workspace config: `unit` project (test/lib/, test/utils/) and `e2e` project (test/e2e/).

## Test Isolation

**Always** use `createTestEnv()` from `test/helpers/setup.ts`:

```typescript
let env: TestEnv;
beforeEach(() => { env = createTestEnv(); });
afterEach(() => { env.cleanup(); });
```

This sets `REVEILLE_HOME` to a temp dir and `REVEILLE_SKIP_LAUNCHCTL=1`.

## Test Patterns

### Unit tests (test/lib/, test/utils/)

Import source directly, call functions, assert return values.

### E2E CLI tests (test/e2e/cli/)

Use `runCLI()` helper from `test/e2e/helpers/cli.ts`:

```typescript
const result = await runCLI(["add", "--name", "test"], env.tmpDir);
expect(result.exitCode).toBe(0);
expect(result.stdout).toContain("Created task:");
```

### E2E Component tests (test/e2e/components/)

Use ink-testing-library:

```typescript
const { lastFrame } = render(<TaskList />);
expect(lastFrame()).toContain("NAME");
```

## E2E Test Requirements

新機能追加時は必ず E2E テストシナリオも追加:

| 変更内容 | 追加先 |
|----------|--------|
| 新コマンド | `test/e2e/cli/` に正常系・異常系テスト |
| 新 UI コンポーネント | `test/e2e/components/` にレンダリングテスト |
| 既存機能の変更 | 既存 E2E テストの更新 + 新シナリオ追加 |

## Timeouts

- E2E tests: 30s timeout (configured in vitest.config.ts)
- Unit tests: default 5s
- CLI helper: 15s per command execution
