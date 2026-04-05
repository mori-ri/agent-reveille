# src/components/ — Reusable Ink Components

Stateless, presentational components only.

## Rules

- Accept data as props — no direct calls to lib functions
- Use Ink primitives: `Box`, `Text` (not raw console output)
- No side effects (no file I/O, no process.exit)
- Test with ink-testing-library in `test/e2e/components/`
