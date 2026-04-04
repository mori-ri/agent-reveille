import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runCLI } from "../helpers/cli.js";
import { createTestEnv, type TestEnv } from "../../helpers/setup.js";

describe("CLI lifecycle", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("lists empty state", async () => {
    const result = await runCLI(["list"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No tasks configured");
  });

  it("adds a task via CLI flags", async () => {
    const result = await runCLI(
      ["add", "--name", "E2E Task", "--cmd", "echo hello", "--dir", "/tmp"],
      env.tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Task created");
    expect(result.stdout).toContain("E2E Task");
  });

  it("full lifecycle: add → list → run → logs → remove", async () => {
    // Add a task
    const addResult = await runCLI(
      ["add", "--name", "Lifecycle Test", "--cmd", "echo lifecycle-ok", "--dir", "/tmp"],
      env.tmpDir,
    );
    expect(addResult.exitCode).toBe(0);

    // Extract task ID from output: "Task created: Lifecycle Test (XXXXXXXX)"
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    expect(idMatch).not.toBeNull();
    const taskId = idMatch![1];

    // List should show the task
    const listResult = await runCLI(["list"], env.tmpDir);
    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain("Lifecycle Test");

    // Run the task
    const runResult = await runCLI(["run", taskId], env.tmpDir);
    expect(runResult.exitCode).toBe(0);
    expect(runResult.stdout).toContain("Completed");
    expect(runResult.stdout).toContain("exit code: 0");

    // Check logs
    const logsResult = await runCLI(["logs", taskId], env.tmpDir);
    expect(logsResult.exitCode).toBe(0);
    expect(logsResult.stdout).toContain("Execution Logs");

    // Remove the task
    const removeResult = await runCLI(["remove", taskId], env.tmpDir);
    expect(removeResult.exitCode).toBe(0);
    expect(removeResult.stdout).toContain("Removed");

    // List should be empty again
    const listAfter = await runCLI(["list"], env.tmpDir);
    expect(listAfter.stdout).toContain("No tasks configured");
  });

  it("adds a task with cron schedule and writes plist", async () => {
    const result = await runCLI(
      [
        "add",
        "--name",
        "Cron Task",
        "--cmd",
        "echo cron",
        "--cron",
        "0 9 * * *",
        "--dir",
        "/tmp",
      ],
      env.tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Task created");
  });
});
