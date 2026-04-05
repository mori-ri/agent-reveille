# src/lib/ — Core Business Logic

Pure logic only. No React, Ink, or chalk imports allowed in this directory.

## Module Responsibilities

| Module | Role |
|--------|------|
| `schema.ts` | Zod schemas + TypeScript types (source of truth) |
| `db.ts` | Persistence layer: read/write tasks (Markdown+frontmatter) and executions (JSON) |
| `tasks.ts` | CRUD API — commands should call this, not db.ts directly |
| `executor.ts` | Spawn agent processes, capture stdout/stderr to log files, handle timeout |
| `scheduler.ts` | Cron-to-launchd conversion, plist install/uninstall |
| `paths.ts` | All filesystem paths centralized here. Uses REVEILLE_HOME for test isolation |
| `agents.ts` | Agent presets (AGENTS record). Maps AgentId → command template |

## Patterns

### Zod schema naming

```typescript
export const TaskSchema = z.object({ ... });
export type Task = z.infer<typeof TaskSchema>;
```

### Atomic writes (db.ts)

```typescript
const tmpPath = `${filePath}.tmp`;
writeFileSync(tmpPath, content, "utf-8");
renameSync(tmpPath, filePath);
```

### Adding a new agent

1. Add to `AgentId` enum in `schema.ts`
2. Add entry to `AGENTS` record in `agents.ts`

### Adding a new field to Task

1. Update `TaskSchema` / `CreateTaskInput` in `schema.ts`
2. Update serialization in `db.ts` if needed
3. Update relevant commands that display the field
4. Add tests for the new field
