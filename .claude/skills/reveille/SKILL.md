---
name: reveille
description: Schedule AI coding agents to run automatically. Use when the user wants to set up, manage, or check scheduled tasks for AI agents like Claude Code, Codex, or Gemini via macOS launchd.
allowed-tools: Bash(npx tsx bin/reveille.ts *), Bash(reveille *), Read, Glob, Grep
argument-hint: "[action] [details]"
---

# Reveille - AI Agent Task Scheduler

You have access to `reveille`, a CLI tool for scheduling AI coding agents via macOS launchd.

## Current State

Registered tasks:
!`npx tsx bin/reveille.ts list 2>/dev/null || reveille list 2>/dev/null || echo "No tasks configured yet."`

## Available Commands

```
reveille add       # Interactive task creation wizard
reveille edit <id> # Edit an existing task (interactive wizard)
reveille list      # List all tasks with status
reveille run <id>  # Execute a task immediately
reveille logs [id] # View execution history
reveille enable <id>   # Enable scheduling (load launchd plist)
reveille disable <id>  # Disable scheduling (unload launchd plist)
reveille remove <id>   # Delete a task and its plist
```

### Non-interactive task creation

```
reveille add --name "<name>" --agent <agent> --cmd '<command>' --cron "<cron>" --dir <path>
```

- `--agent`: claude, codex, gemini, aider, or custom
- `--cron`: Standard 5-field cron expression (minute hour day month weekday)
- `--dir`: Working directory (defaults to cwd)

### Non-interactive task editing

```
reveille edit <id> --prompt "<new prompt>"
reveille edit <id> --name "<name>" --cmd '<command>' --cron "<cron>" --dir <path>
```

- `--prompt`: Update the agent prompt (automatically rebuilds the command)
- `--name`: Update the task name
- `--cmd`: Update the raw command (overrides prompt)
- `--cron`: Set cron schedule
- `--interval`: Set interval schedule (seconds)
- `--dir`: Update working directory

When called without flags, opens the interactive edit wizard.

## How to Handle User Requests

### "Schedule a task" / "Set up a recurring job"

1. Determine from the user's request:
   - **What** to run (the prompt or command)
   - **When** to run it (translate natural language to cron, e.g., "every morning" -> "3 9 * * *")
   - **Where** to run it (project directory, default to current)
   - **Which agent** (default to claude)
2. Construct the non-interactive `reveille add` command
3. Run it via Bash
4. Confirm the task was created and explain the schedule

### "Edit a task" / "Change the prompt" / "Update the schedule"

1. Get the task ID (from `reveille list` or user input)
2. Determine what to change:
   - **Prompt**: Use `--prompt` flag (auto-rebuilds agent command)
   - **Schedule**: Use `--cron` or `--interval` flag
   - **Name/directory**: Use `--name` or `--dir` flag
3. Run the `reveille edit <id> --prompt "new prompt" --cron "..."` command
4. Confirm the update to the user

### "Show my tasks" / "What's scheduled?"

Run `reveille list` and present the results.

### "Check the logs" / "Did it run?"

Run `reveille logs <id>` and summarize the results.

### "Stop/pause a task"

Run `reveille disable <id>` to unload the launchd plist without deleting the task.

### "Remove a task"

Run `reveille remove <id>` after confirming with the user.

### "Run it now"

Run `reveille run <id>` to execute immediately.

## Cron Quick Reference

| Natural language | Cron expression |
|-----------------|----------------|
| Every morning at 9am | 3 9 * * * |
| Every 30 minutes | */30 * * * * |
| Every 2 hours | 7 */2 * * * |
| Weekdays at 9am | 3 9 * * 1-5 |
| Every Monday at 10am | 0 10 * * 1 |
| Every night at midnight | 57 23 * * * |

Note: Avoid :00 and :30 marks when possible to spread load.

## Agent Command Templates

| Agent | Command |
|-------|---------|
| Claude Code | `claude -p "prompt" --dangerously-skip-permissions` |
| Codex CLI | `codex -q "prompt"` |
| Gemini CLI | `gemini -p "prompt"` |
| Aider | `aider --message "prompt"` |

## Important Notes

- Use the **project directory** of the user's current working directory as the default `--dir`
- Prefer off-minute scheduling (e.g., 3 or 7 instead of 0 or 30)
- Always show the human-readable schedule after creating a task
- When the user says "every morning" without specifying a time, use 9am
- The `--dangerously-skip-permissions` flag is required for unattended Claude Code execution

## User Request

$ARGUMENTS
