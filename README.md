# reveille

[日本語版 README はこちら](README_ja.md)

AI agent task scheduler for macOS. Schedule Claude Code, Codex, Gemini, and other AI agents to run automatically via launchd — from development automation to daily routines.

```
$ reveille list

  reveille - Tasks

  ID       NAME              AGENT    SCHEDULE              STATUS      LAST RUN
  ─────────────────────────────────────────────────────────────────────────────────
  a1b2c3d4 Run tests         claude   At 09:03 AM           ● active    3 hours ago
  e5f6g7h8 Daily note        claude   At 08:00 AM           ● active    12 hours ago
  i9j0k1l2 Update deps       codex    At 12:00 AM, Mon      ● paused    3 days ago

  3 task(s)
```

## Why reveille?

AI agents like Claude Code are not just coding tools — they can be your daily partner. Automate development tasks like running tests and fixing lint errors, but also personal routines like writing daily notes, journaling, or end-of-day reflections. But scheduling them requires manual launchd plist configuration, environment variable management, and log handling.

reveille bridges this gap:

- **One command to schedule** — no plist XML, no `launchctl` juggling
- **Built for AI agents** — presets for Claude Code, Codex, Gemini, Aider
- **Not just for code** — schedule daily notes, reflections, or any recurring agent task
- **Execution tracking** — every run is logged with status, duration, and output
- **TUI dashboard** — monitor all your scheduled agents in one view

## Install

```bash
npm install -g reveille
```

Or run directly:

```bash
npx reveille
```

Requires Node.js 20+.

## Quick Start

### 1. Create a task

Interactive wizard:

```bash
reveille add
```

Or non-interactive:

```bash
reveille add \
  --name "Daily tests" \
  --agent claude \
  --cmd 'claude -p "run the test suite and fix any failures" --dangerously-skip-permissions' \
  --cron "3 9 * * *" \
  --dir ~/projects/my-app
```

### 2. Check your tasks

```bash
reveille list
```

### 3. Run a task immediately

```bash
reveille run <task-id>
```

### 4. View execution history

```bash
reveille logs <task-id>
```

### 5. Open the dashboard

```bash
reveille
```

## Commands

| Command | Description |
|---------|-------------|
| `reveille add` | Create a new scheduled task (interactive wizard) |
| `reveille list` | List all tasks with status and last run |
| `reveille run <id>` | Execute a task immediately |
| `reveille logs [id]` | View execution history |
| `reveille enable <id>` | Enable scheduling (load launchd plist) |
| `reveille disable <id>` | Disable scheduling (unload launchd plist) |
| `reveille remove <id>` | Delete a task and its plist |
| `reveille dashboard` | Open TUI dashboard (also the default) |

## Dashboard

The interactive dashboard provides a full overview of your scheduled tasks.

```
  reveille - AI Agent Task Scheduler              v0.1.0
  ──────────────────────────────────────────────────────────────────────
    Tasks

  ❯ a1b2c3d4 Run tests      claude  At 09:03 AM       ● active  3h ago
    e5f6g7h8 Lint & fix      claude  Every 2 hours     ● active  45m ago

  ──────────────────────────────────────────────────────────────────────
  Run tests (a1b2c3d4)
  Command: claude -p "run the test suite" --dangerously-skip-permissions
  Dir:     /Users/you/projects/my-app

  Last Execution:
    ✓ success | Duration: 2m 34s | Exit: 0
    All 47 tests passed.

  j/k navigate  a add  r remove  space toggle  R run now  l logs  q quit
```

**Key bindings:**

| Key | Action |
|-----|--------|
| `j` / `k` | Navigate up/down |
| `a` | Add new task |
| `r` | Remove selected task |
| `Space` | Toggle enable/disable |
| `R` | Run selected task |
| `l` | View logs |
| `q` | Quit |

## Supported Agents

| Agent | Binary | Non-interactive flag |
|-------|--------|---------------------|
| Claude Code | `claude` | `-p "prompt" --dangerously-skip-permissions` |
| Codex CLI | `codex` | `-q "prompt"` |
| Gemini CLI | `gemini` | `-p "prompt"` |
| Aider | `aider` | `--message "prompt"` |
| Custom | any | user-defined command |

reveille auto-detects which agents are installed on your system.

## How It Works

### Architecture

```
┌──────────┐     ┌──────────────────┐     ┌──────────────────┐
│  launchd  │────▶│  reveille run <id> │────▶│  AI Agent CLI    │
│  (macOS)  │     │  (executor)      │     │  (claude, etc.)  │
└──────────┘     └──────────────────┘     └──────────────────┘
                         │
                         ▼
                 ┌──────────────────┐
                 │  Logs & Status   │
                 │  (~/.config/     │
                 │   reveille/)       │
                 └──────────────────┘
```

reveille does **not** call your AI agent directly from launchd. Instead, the generated plist runs `reveille run <task-id>`, which:

1. Records execution start
2. Spawns the agent command with proper environment variables
3. Captures stdout/stderr to log files
4. Records the result (exit code, duration, status)

This gives you full execution tracking without any extra setup.

### launchd Integration

When you create a scheduled task, reveille:

1. Generates a plist file at `~/Library/LaunchAgents/com.reveille.task.<id>.plist`
2. Converts your cron expression to launchd's `StartCalendarInterval` or `StartInterval`
3. Injects your shell's `PATH` so agent binaries are found
4. Loads the plist via `launchctl load`

Unlike raw crontab, launchd survives sleep/wake cycles and is the native macOS scheduler.

### Data Storage

| Path | Contents |
|------|----------|
| `~/.config/reveille/tasks.json` | Task definitions |
| `~/.config/reveille/executions.json` | Execution history |
| `~/.local/share/reveille/logs/<task-id>/` | Full stdout/stderr log files |
| `~/Library/LaunchAgents/com.reveille.task.*.plist` | Generated launchd plists |

## Examples

### Run tests every morning

```bash
reveille add \
  --name "Morning tests" \
  --cmd 'claude -p "run all tests, fix failures, and commit fixes" --dangerously-skip-permissions' \
  --cron "3 9 * * *" \
  --dir ~/projects/my-app
```

### Lint check every 2 hours

```bash
reveille add \
  --name "Lint patrol" \
  --cmd 'claude -p "run the linter and fix all warnings" --dangerously-skip-permissions' \
  --cron "7 */2 * * *" \
  --dir ~/projects/my-app
```

### Weekly dependency update

```bash
reveille add \
  --name "Dep update" \
  --cmd 'claude -p "update all dependencies to latest compatible versions, run tests, commit if passing" --dangerously-skip-permissions' \
  --cron "0 10 * * 1" \
  --dir ~/projects/my-app
```

### Daily note every morning

```bash
reveille add \
  --name "Daily note" \
  --agent claude \
  --cmd 'claude -p "Create today'\''s daily note in ~/notes/. Include the date, a summary of recent git activity across my projects, and a section for TODOs." --dangerously-skip-permissions' \
  --cron "0 8 * * *" \
  --dir ~/notes
```

### End-of-day reflection

```bash
reveille add \
  --name "Evening reflection" \
  --agent claude \
  --cmd 'claude -p "Review what I worked on today based on git logs and open TODOs. Write a brief reflection in ~/notes/reflections/ with wins, blockers, and what to focus on tomorrow." --dangerously-skip-permissions' \
  --cron "0 18 * * 1-5" \
  --dir ~/notes
```

### Manual task (run on demand only)

```bash
reveille add \
  --name "Full review" \
  --cmd 'claude -p "review the entire codebase for security issues" --dangerously-skip-permissions' \
  --dir ~/projects/my-app
# Select "Manual only" for schedule type
```

## Cron Expression Reference

| Expression | Meaning |
|-----------|---------|
| `0 9 * * *` | Every day at 9:00 AM |
| `*/30 * * * *` | Every 30 minutes |
| `0 */2 * * *` | Every 2 hours |
| `0 10 * * 1` | Every Monday at 10:00 AM |
| `0 0 1 * *` | First day of every month at midnight |

## Claude Code Integration

reveille ships with a [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills) so you can manage scheduled tasks directly from Claude Code conversations.

### Setup

The skill is automatically available when you open this project in Claude Code.

### Usage

Just type `/reveille` followed by what you want to do:

```
/reveille schedule daily tests at 9am
/reveille show my tasks
/reveille check the logs for task a1b2c3d4
```

Claude Code will translate your request into the appropriate `reveille` command and run it for you.

## Development

```bash
git clone https://github.com/mori-ri/reveille.git
cd reveille
npm install

# Run in dev mode
npx tsx bin/reveille.ts --help
npx tsx bin/reveille.ts add
npx tsx bin/reveille.ts list

# Run tests
npm test

# Build
npm run build
```

## License

MIT
