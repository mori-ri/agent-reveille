# reveille

AI coding agent task scheduler with launchd integration for macOS.

## Quick Reference

```bash
npm run dev -- <command>     # Run in dev mode (tsx)
npm run build                # Build for distribution (tsup)
npm test                     # All tests (unit + e2e)
npm run test:unit            # Unit tests only
npm run test:e2e             # E2E tests only
npm run typecheck            # TypeScript strict check
npm run lint                 # Biome lint + format check
npm run lint:fix             # Auto-fix lint + format issues
```

## Architecture

### Data flow

```
CLI: bin/reveille.ts → src/commands/<cmd> → src/lib/tasks.ts → src/lib/db.ts → filesystem
launchd: plist → `reveille run <id>` → src/lib/executor.ts → spawn agent process
chaining: run success → src/lib/chaining.ts → executeTask(dependent) → recurse
```

launchd plists invoke `reveille run <id>`, NOT the agent directly. This enables automatic logging, timeout handling (30min default), status tracking, and task chaining.

### Key modules

- `schema.ts` — Zod schemas: Task, Execution, CreateTaskInput (source of truth for types)
- `db.ts` — Persistence: Markdown+YAML frontmatter for tasks, JSON for executions. Atomic writes (tmp+rename)
- `tasks.ts` — CRUD API (commands should call this, not db.ts directly)
- `executor.ts` — Spawn agent processes, capture logs, handle timeouts
- `chaining.ts` — Task chaining: trigger dependent tasks after successful execution
- `scheduler.ts` — Cron-to-launchd conversion (`*/N` → StartInterval, others → StartCalendarInterval)
- `agents.ts` — Agent presets (Claude, Codex, Gemini, Aider, Custom)
- `paths.ts` — Centralized filesystem paths, uses REVEILLE_HOME for test isolation

### Storage

- Tasks: `~/.config/reveille/tasks/<id>.md` (YAML frontmatter + command body)
- Executions: `~/.config/reveille/executions/<id>.json`
- Logs: `~/.local/share/reveille/logs/<task-id>/<timestamp>.{stdout,stderr}.log`

## Conventions

- TypeScript strict mode, ES2022 target, ESM only
- All imports use `.js` extension (ESM resolution requirement)
- All imports use **relative paths** (not path aliases)
- Zod for runtime validation — schema.ts is the single source of truth
- Atomic file writes: write to `.tmp`, then `renameSync`
- date-fns for time, chalk for colors, cronstrue for cron descriptions

## Coding Rules

- Pure logic in `src/lib/` — no React, Ink, or chalk imports allowed
- UI in `src/commands/` (Ink components) and `src/components/` (reusable)
- Error handling: commands use `console.error()` + `process.exit(1)`; lib functions throw
- File I/O goes through `db.ts` — never import `fs` directly in commands
- Two command patterns: simple (.ts) and interactive (.tsx) — see `src/commands/CLAUDE.md`

## Development Methodology (TDD)

実装は必ず TDD で行う:

1. **Red** — 先に失敗するテストを書く
2. **Green** — テストを通す最小限の実装を書く
3. **Refactor** — コードを整理する

新機能は必ず **ユニットテスト + E2E テストシナリオ** をセットで追加すること。

## Testing

**変更後は必ず実行:** `npm run typecheck && npm run lint && npm test`

- Unit tests mirror source: `test/lib/<module>.test.ts`, `test/utils/<module>.test.ts`
- E2E CLI tests: `test/e2e/cli/` — spawn real CLI process via `runCLI()` helper
- E2E component tests: `test/e2e/components/` — ink-testing-library render + `lastFrame()`
- Test isolation: `createTestEnv()` from `test/helpers/setup.ts` (sets REVEILLE_HOME to tmpdir)
- REVEILLE_SKIP_LAUNCHCTL=1 prevents actual launchctl calls

## Anti-patterns (DO NOT)

- Do NOT add shebang to `bin/reveille.ts` (tsup injects it at build time)
- Do NOT import React/Ink in `src/lib/` files
- Do NOT use `fs` directly in commands — go through `db.ts`
- Do NOT call launchctl without checking REVEILLE_SKIP_LAUNCHCTL
- Do NOT use inline snapshots — they break when formatting changes
- Do NOT commit without running full quality gate (typecheck + lint + test)
- Do NOT add a new command without updating `.claude/skills/reveille/SKILL.md`

## One-shot Agent Notes

- CI 失敗時は最大2回まで修正を試行する。3回失敗したら停止して問題を報告すること
- ファイル保存後は Biome が自動フォーマットする（hooks 設定済み）
- 新機能追加時は E2E テストシナリオも必ず追加すること
