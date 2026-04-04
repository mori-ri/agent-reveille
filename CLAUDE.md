# reveille

AI coding agent task scheduler with launchd integration.

## Tech Stack

- TypeScript + Ink (React for CLI)
- JSON file storage for task configs and execution history
- launchd plist generation for macOS scheduling

## Project Structure

- `bin/reveille.ts` - CLI entry point
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

- launchd plists call `reveille run <id>`, not the agent directly
- This allows automatic logging, timeout handling, and status tracking
- Task configs stored in ~/.config/reveille/tasks.json, execution history in ~/.config/reveille/executions.json
- Execution logs stored at ~/.local/share/reveille/logs/
