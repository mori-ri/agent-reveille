import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type TestEnv, createTestEnv } from "../../helpers/setup.js";
import { runCLI } from "../helpers/cli.js";

describe("CLI task chaining", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("creates a chained task via --after flag", async () => {
    // Create upstream task
    const addA = await runCLI(
      ["add", "--name", "TaskA", "--cmd", "echo a", "--dir", "/tmp"],
      env.tmpDir,
    );
    expect(addA.exitCode).toBe(0);
    const idA = addA.stdout.match(/\(([a-zA-Z0-9_-]+)\)/)?.[1];

    // Create downstream task with --after
    const addB = await runCLI(
      ["add", "--name", "TaskB", "--cmd", "echo b", "--dir", "/tmp", "--after", idA],
      env.tmpDir,
    );
    expect(addB.exitCode).toBe(0);
    expect(addB.stdout).toContain("Task created");
  });

  it("runs chained task B after task A succeeds", async () => {
    // Create A
    const addA = await runCLI(
      ["add", "--name", "TaskA", "--cmd", "echo task-a-done", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idA = addA.stdout.match(/\(([a-zA-Z0-9_-]+)\)/)?.[1];

    // Create B that depends on A
    const addB = await runCLI(
      ["add", "--name", "TaskB", "--cmd", "echo task-b-done", "--dir", "/tmp", "--after", idA],
      env.tmpDir,
    );
    const idB = addB.stdout.match(/\(([a-zA-Z0-9_-]+)\)/)?.[1];
    expect(idB).toBeDefined();

    // Run A — B should be triggered automatically
    const runResult = await runCLI(["run", idA], env.tmpDir);
    expect(runResult.exitCode).toBe(0);
    expect(runResult.stdout).toContain("Completed");
    expect(runResult.stdout).toContain("Chained: TaskB");
    expect(runResult.stdout).toContain("TaskB completed");
  });

  it("does not run chained task B when task A fails", async () => {
    // Create A that fails
    const addA = await runCLI(
      ["add", "--name", "TaskA", "--cmd", "exit 1", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idA = addA.stdout.match(/\(([a-zA-Z0-9_-]+)\)/)?.[1];

    // Create B that depends on A
    await runCLI(
      ["add", "--name", "TaskB", "--cmd", "echo should-not-run", "--dir", "/tmp", "--after", idA],
      env.tmpDir,
    );

    // Run A — should fail, B should NOT run
    const runResult = await runCLI(["run", idA], env.tmpDir);
    expect(runResult.exitCode).toBe(1);
    expect(runResult.stdout).not.toContain("Chained: TaskB");
  });

  it("rejects --after with invalid task ID", async () => {
    const result = await runCLI(
      ["add", "--name", "Bad", "--cmd", "echo", "--dir", "/tmp", "--after", "nonexistent"],
      env.tmpDir,
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("afterTask not found");
  });

  it("chains three levels: A → B → C", async () => {
    const addA = await runCLI(
      ["add", "--name", "A", "--cmd", "echo chain-a", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idA = addA.stdout.match(/\(([a-zA-Z0-9_-]+)\)/)?.[1];

    const addB = await runCLI(
      ["add", "--name", "B", "--cmd", "echo chain-b", "--dir", "/tmp", "--after", idA],
      env.tmpDir,
    );
    const idB = addB.stdout.match(/\(([a-zA-Z0-9_-]+)\)/)?.[1];

    await runCLI(
      ["add", "--name", "C", "--cmd", "echo chain-c", "--dir", "/tmp", "--after", idB],
      env.tmpDir,
    );

    const runResult = await runCLI(["run", idA], env.tmpDir);
    expect(runResult.exitCode).toBe(0);
    expect(runResult.stdout).toContain("Completed");
    expect(runResult.stdout).toContain("Chained: B");
    expect(runResult.stdout).toContain("B completed");
    expect(runResult.stdout).toContain("Chained: C");
    expect(runResult.stdout).toContain("C completed");
  });

  it("triggers disabled (paused) chained task", async () => {
    // Create A with cron schedule
    const addA = await runCLI(
      ["add", "--name", "TaskA", "--cmd", "echo done", "--dir", "/tmp", "--cron", "0 9 * * *"],
      env.tmpDir,
    );
    const idA = addA.stdout.match(/\(([a-zA-Z0-9_-]+)\)/)?.[1];

    // Create B with cron + after A
    const addB = await runCLI(
      [
        "add",
        "--name",
        "TaskB",
        "--cmd",
        "echo chained",
        "--dir",
        "/tmp",
        "--cron",
        "0 10 * * *",
        "--after",
        idA,
      ],
      env.tmpDir,
    );
    const idB = addB.stdout.match(/\(([a-zA-Z0-9_-]+)\)/)?.[1];

    // Disable B
    await runCLI(["disable", idB], env.tmpDir);

    // Run A — B should still be triggered via chain even though disabled
    const runResult = await runCLI(["run", idA], env.tmpDir);
    expect(runResult.exitCode).toBe(0);
    expect(runResult.stdout).toContain("Chained: TaskB");
    expect(runResult.stdout).toContain("TaskB completed");
  });
});
