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
});
