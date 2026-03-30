# cronai

AI coding agent task scheduler with launchd integration.

## Tech Stack

- TypeScript + Ink (React for CLI)
- SQLite via better-sqlite3 for data storage
- launchd plist generation for macOS scheduling

## Project Structure

- `bin/cronai.ts` - CLI entry point
- `src/commands/` - CLI subcommands (each file = one command)
- `src/components/` - Reusable Ink TUI components
- `src/lib/` - Core business logic (no UI)
- `src/utils/` - Shared utilities
- `test/` - Vitest tests

## Development

```bash
npm install
npm run dev -- <command>     # Run in dev mode
npm run build                # Build for distribution
npm test                     # Run tests
```

## Architecture

- launchd plists call `cronai run <id>`, not the agent directly
- This allows automatic logging, timeout handling, and status tracking
- Task configs and execution history stored in SQLite at ~/.config/cronai/cronai.db
- Execution logs stored at ~/.local/share/cronai/logs/
