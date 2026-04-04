---
name: ship
description: "Commit staged changes and create a pull request on GitHub. Use this skill when the user says 'コミットして', 'PRを作って', 'プルリクエスト作成', 'ship it', 'commit and PR', 'push', 'マージしたい', or wants to commit their work and open a PR. Also trigger when the user says 'ship', 'リリースして', or asks to send changes upstream."
allowed-tools: Bash(git *), Bash(gh pr *), Bash(gh api *), Bash(npm run test:e2e *), Bash(npm test *), Bash(npx vitest *), Read, Glob, Grep, Edit, Agent
---

# Ship — Commit & Pull Request

Commit changes and create a pull request in one flow.

## Workflow

### 1. Assess the current state

Run these in parallel:

```bash
git status
git diff --stat
git diff --staged --stat
git log --oneline -5
```

Understand what's changed: modified files, new files, staged vs unstaged.

### 2. Run quality gates

Before committing, run these checks. Both must pass — if either fails, fix the issues before proceeding.

#### a. tests

```bash
npm run test
```

If any test fails, read the failing test and the relevant source file, diagnose the issue, and fix it. Do not proceed to commit until all tests pass.

#### b. Code simplifier

Use the `code-simplifier` Agent (subagent_type: "code-simplifier") to review the changed code for reuse, quality, and efficiency. If it suggests fixes, apply them and re-run the E2E tests to make sure nothing broke.

### 3. Stage files

- Stage relevant files by name — avoid `git add -A` or `git add .` to prevent accidentally including sensitive files (.env, credentials) or large binaries
- Never stage `node_modules/`, `.env`, or credential files
- If nothing is staged and nothing is modified, tell the user there's nothing to commit

### 4. Write the commit message

Follow the project's established commit message style:

```
<Action verb> <brief title>

- <Detail 1>
- <Detail 2>
- <Detail 3>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

- Action verbs: Add, Fix, Update, Refactor, Remove, Prepare, Rename
- Title should be concise (under 72 chars)
- Bullet points describe the key changes
- Always include the Co-Authored-By footer

Use a HEREDOC to pass the message:

```bash
git commit -m "$(cat <<'EOF'
<Title>

- <detail>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### 5. Push the branch

```bash
git push -u origin HEAD
```

If the branch doesn't have an upstream yet, the `-u` flag sets it.

### 6. Create the pull request

Use `gh pr create`:

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
- <bullet 1>
- <bullet 2>

## Test plan
- [ ] <verification step>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- Keep the PR title short (under 70 chars), matching the commit title
- Summary section: 1-3 bullet points of what changed and why
- Test plan section: how to verify the changes work
- If a PR already exists for this branch, skip creation and tell the user

### 7. Report back

Show the user:
- The commit hash and message
- The PR URL

## Important

- Never force push (`--force`) unless the user explicitly asks
- Never amend existing commits unless asked
- Never skip pre-commit hooks (`--no-verify`)
- If a hook fails, diagnose and fix rather than bypassing
- Ask before committing if the changes look unintentional (e.g., only lock files changed)
- The remote is `origin` at `github.com/mori-ri/agent-reveille`

$ARGUMENTS
