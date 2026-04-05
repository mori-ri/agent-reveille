import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type TestEnv, createTestEnv } from "../../helpers/setup.js";
import { runCLI } from "../helpers/cli.js";

describe("CLI edit", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  async function addTask(
    args: string[] = ["--name", "Test Task", "--cmd", "echo hello", "--dir", "/tmp"],
  ): Promise<string> {
    const result = await runCLI(["add", ...args], env.tmpDir);
    expect(result.exitCode).toBe(0);
    const match = result.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    expect(match).not.toBeNull();
    return match?.[1] as string;
  }

  it("shows usage when called without task ID", async () => {
    const result = await runCLI(["edit"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Usage");
  });

  it("errors when task does not exist", async () => {
    const result = await runCLI(["edit", "nonexistent", "--name", "New"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Task not found");
  });

  it("updates task name via --name", async () => {
    const taskId = await addTask();
    const result = await runCLI(["edit", taskId, "--name", "Updated Name"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Task updated");
    expect(result.stdout).toContain("Updated Name");

    const listResult = await runCLI(["list"], env.tmpDir);
    expect(listResult.stdout).toContain("Updated Name");
  });

  it("updates command via --cmd", async () => {
    const taskId = await addTask();
    const result = await runCLI(["edit", taskId, "--cmd", "echo updated"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Task updated");
    expect(result.stdout).toContain("echo updated");
  });

  it("updates working directory via --dir", async () => {
    const taskId = await addTask();
    const result = await runCLI(["edit", taskId, "--dir", "/var/tmp"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("/var/tmp");
  });

  it("adds cron schedule via --cron", async () => {
    const taskId = await addTask();
    const result = await runCLI(["edit", taskId, "--cron", "0 9 * * *"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("cron 0 9 * * *");
  });

  it("sets interval via --interval", async () => {
    const taskId = await addTask();
    const result = await runCLI(["edit", taskId, "--interval", "300"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("every 300s");
  });

  it("updates multiple fields at once", async () => {
    const taskId = await addTask();
    const result = await runCLI(
      ["edit", taskId, "--name", "Multi Update", "--dir", "/var/tmp", "--cron", "5 10 * * *"],
      env.tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Multi Update");
    expect(result.stdout).toContain("/var/tmp");
    expect(result.stdout).toContain("cron 5 10 * * *");
  });

  it("rejects invalid cron expression", async () => {
    const taskId = await addTask();
    const result = await runCLI(["edit", taskId, "--cron", "invalid"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Invalid cron expression");
  });

  it("rejects invalid interval value", async () => {
    const taskId = await addTask();
    const result = await runCLI(["edit", taskId, "--interval", "abc"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Invalid interval value");
  });

  it("shows current task info when no flags provided (non-TTY)", async () => {
    const taskId = await addTask();
    const result = await runCLI(["edit", taskId], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No changes specified");
    expect(result.stdout).toContain("Test Task");
  });

  it("updates command via --prompt for agent tasks", async () => {
    const taskId = await addTask([
      "--name",
      "Agent Task",
      "--agent",
      "claude",
      "--cmd",
      "fix the bug",
      "--dir",
      "/tmp",
    ]);
    const result = await runCLI(["edit", taskId, "--prompt", "new prompt"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("new prompt");
  });

  it("--cmd overrides --prompt when both provided", async () => {
    const taskId = await addTask();
    const result = await runCLI(
      ["edit", taskId, "--prompt", "ignored prompt", "--cmd", "actual command"],
      env.tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("actual command");
  });

  it("updates model via --model", async () => {
    const taskId = await addTask([
      "--name",
      "Model Task",
      "--agent",
      "claude",
      "--cmd",
      "test prompt",
      "--dir",
      "/tmp",
    ]);
    const result = await runCLI(["edit", taskId, "--model", "sonnet"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("sonnet");
  });

  it("updates afterTask via --after", async () => {
    const taskId1 = await addTask(["--name", "First Task", "--cmd", "echo first", "--dir", "/tmp"]);
    const taskId2 = await addTask([
      "--name",
      "Second Task",
      "--cmd",
      "echo second",
      "--dir",
      "/tmp",
    ]);
    const result = await runCLI(["edit", taskId2, "--after", taskId1], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(taskId1);
  });
});
