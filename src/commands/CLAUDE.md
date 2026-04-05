# src/commands/ — CLI Subcommands

Each file = one command. The filename (minus extension) is the command name.

## Two Command Patterns

### Simple command (.ts)

For non-interactive commands (enable, disable, remove, run):

```typescript
import { getTask, updateTask } from "../lib/tasks.js";

export default async function enable(args: string[]) {
  const id = args[0];
  if (!id) {
    console.error("Usage: reveille enable <task-id>");
    process.exit(1);
  }
  // ... logic using lib functions
}
```

### Interactive command (.tsx)

For TUI commands (add, list, logs, dashboard):

```typescript
import { render } from "ink";

// Named export for testing with ink-testing-library
export function TaskList() {
  return <Box>...</Box>;
}

// Default export for CLI entry
export default async function list(_args: string[]) {
  const { waitUntilExit } = render(<TaskList />);
  await waitUntilExit();
}
```

## Rules

- Import from `../lib/` and `../utils/` only — never from other commands
- All imports use relative paths with `.js` extension
- Error pattern: `console.error(message)` then `process.exit(1)`
- Ink commands must export the component by name (for test) AND as default function (for CLI)
- Non-interactive flags: check args before starting Ink render (see `add.tsx` --name/--cmd pattern)

## Adding a New Command

1. TDD: Write E2E test first in `test/e2e/cli/<name>.test.ts` (or add to existing file)
2. Create `src/commands/<name>.ts` (simple) or `<name>.tsx` (interactive)
3. Add the command case to `bin/reveille.ts` switch statement
4. If interactive: add component test in `test/e2e/components/<name>.test.tsx`
5. **Update `.claude/skills/reveille/SKILL.md`** — Available Commands セクションに新コマンドを追加
6. Verify: `npm run typecheck && npm run lint && npm test`
