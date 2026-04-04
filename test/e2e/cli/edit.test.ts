import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runCLI } from "../helpers/cli.js";
import { createTestEnv, type TestEnv } from "../../helpers/setup.js";

describe("CLI edit command", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("shows usage when called without ID", async () => {
    const result = await runCLI(["edit"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Usage");
  });

  it("shows error when editing nonexistent task", async () => {
    const result = await runCLI(["edit", "nonexistent"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Task not found");
  });

  it("updates task name via --name flag", async () => {
    // Create a task first
    const addResult = await runCLI(
      ["add", "--name", "Original Name", "--cmd", "echo hello", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    expect(idMatch).not.toBeNull();
    const taskId = idMatch![1];

    // Edit the name
    const editResult = await runCLI(
      ["edit", taskId, "--name", "Updated Name"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("Updated Name");

    // Verify via list
    const listResult = await runCLI(["list"], env.tmpDir);
    expect(listResult.stdout).toContain("Updated Name");
  });

  it("updates task command via --cmd flag", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Cmd Test", "--cmd", "echo original", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId, "--cmd", "echo updated"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("echo updated");
  });

  it("updates working directory via --dir flag", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Dir Test", "--cmd", "echo hi", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId, "--dir", "/var"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("/var");
  });

  it("adds cron schedule via --cron flag", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Cron Edit", "--cmd", "echo hi", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId, "--cron", "0 10 * * 1-5"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("0 10 * * 1-5");
  });

  it("sets interval schedule via --interval flag", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Interval Edit", "--cmd", "echo hi", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId, "--interval", "1800"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("1800");
  });

  it("updates multiple fields at once", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Multi Edit", "--cmd", "echo old", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId, "--name", "New Multi", "--cmd", "echo new", "--dir", "/var"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("New Multi");
    expect(editResult.stdout).toContain("echo new");
    expect(editResult.stdout).toContain("/var");
  });

  it("rejects invalid cron expression", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Bad Cron", "--cmd", "echo hi", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId, "--cron", "not a cron"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(1);
    expect(editResult.stderr).toContain("Invalid cron");
  });

  it("rejects invalid interval value", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Bad Interval", "--cmd", "echo hi", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId, "--interval", "abc"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(1);
    expect(editResult.stderr).toContain("Invalid interval");
  });

  it("shows no changes message when no flags provided", async () => {
    const addResult = await runCLI(
      ["add", "--name", "No Change", "--cmd", "echo hi", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("No changes");
  });

  it("updates prompt and rebuilds command for claude agent", async () => {
    // Create a task with claude agent
    const addResult = await runCLI(
      ["add", "--name", "Claude Task", "--agent", "claude", "--cmd", 'claude -p "original prompt" --dangerously-skip-permissions', "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    expect(idMatch).not.toBeNull();
    const taskId = idMatch![1];

    // Edit the prompt
    const editResult = await runCLI(
      ["edit", taskId, "--prompt", "updated prompt"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("updated prompt");
    // Command should be rebuilt with new prompt
    expect(editResult.stdout).toContain("claude -p");
    expect(editResult.stdout).toContain("--dangerously-skip-permissions");
  });

  it("shows prompt in output when task has prompt field", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Prompt Show", "--agent", "claude", "--cmd", 'claude -p "show me" --dangerously-skip-permissions', "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    // Set the prompt via edit
    const editResult = await runCLI(
      ["edit", taskId, "--prompt", "visible prompt"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("Prompt:    visible prompt");
  });

  it("updates prompt and rebuilds command for codex agent", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Codex Task", "--agent", "codex", "--cmd", 'codex -q "old prompt"', "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId, "--prompt", "new codex prompt"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("new codex prompt");
    expect(editResult.stdout).toContain("codex -q");
  });

  it("does not rebuild command for custom agent when --prompt is used", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Custom Agent", "--agent", "custom", "--cmd", "echo custom", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    // --prompt on custom agent stores the prompt but does not rebuild command
    const editResult = await runCLI(
      ["edit", taskId, "--prompt", "custom prompt"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    // Command should remain unchanged
    expect(editResult.stdout).toContain("echo custom");
  });

  it("combines --prompt with --name and --dir", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Multi Prompt", "--agent", "claude", "--cmd", 'claude -p "initial" --dangerously-skip-permissions', "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId, "--name", "Updated Multi", "--prompt", "new multi prompt", "--dir", "/var"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("Updated Multi");
    expect(editResult.stdout).toContain("new multi prompt");
    expect(editResult.stdout).toContain("/var");
  });

  it("--cmd overrides --prompt when both provided", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Override Test", "--agent", "claude", "--cmd", 'claude -p "orig" --dangerously-skip-permissions', "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    // When both --prompt and --cmd are given, --cmd should win (applied after)
    const editResult = await runCLI(
      ["edit", taskId, "--prompt", "prompt value", "--cmd", "echo overridden"],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("echo overridden");
  });

  it("non-TTY fallback shows prompt hint in flags list", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Hint Test", "--cmd", "echo hi", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const editResult = await runCLI(
      ["edit", taskId],
      env.tmpDir,
    );
    expect(editResult.exitCode).toBe(0);
    expect(editResult.stdout).toContain("--prompt");
  });

  it("non-TTY fallback shows stored prompt", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Stored Prompt", "--agent", "claude", "--cmd", 'claude -p "stored" --dangerously-skip-permissions', "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    // First set a prompt
    await runCLI(
      ["edit", taskId, "--prompt", "my stored prompt"],
      env.tmpDir,
    );

    // Then view without flags
    const viewResult = await runCLI(
      ["edit", taskId],
      env.tmpDir,
    );
    expect(viewResult.exitCode).toBe(0);
    expect(viewResult.stdout).toContain("my stored prompt");
  });

  it("shows usage with --prompt in help text", async () => {
    const result = await runCLI(["edit"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--prompt");
  });
});
