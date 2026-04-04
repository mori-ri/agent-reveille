import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { runCLI } from "../helpers/cli.js";
import { createTestEnv, type TestEnv } from "../../helpers/setup.js";

describe("CLI task execution", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("executes a successful command", async () => {
    // Add task
    const addResult = await runCLI(
      ["add", "--name", "Success", "--cmd", "echo hello-success", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    // Run
    const runResult = await runCLI(["run", taskId], env.tmpDir);
    expect(runResult.exitCode).toBe(0);
    expect(runResult.stdout).toContain("Completed");
    expect(runResult.stdout).toContain("exit code: 0");
  });

  it("executes a failing command", async () => {
    const addResult = await runCLI(
      ["add", "--name", "Failure", "--cmd", "exit 1", "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    const runResult = await runCLI(["run", taskId], env.tmpDir);
    expect(runResult.exitCode).toBe(1);
    expect(runResult.stdout).toContain("exit code: 1");
  });

  it("writes output to log files", async () => {
    const marker = `test-marker-${Date.now()}`;
    const addResult = await runCLI(
      ["add", "--name", "LogTest", "--cmd", `echo ${marker}`, "--dir", "/tmp"],
      env.tmpDir,
    );
    const idMatch = addResult.stdout.match(/\(([a-zA-Z0-9_-]+)\)/);
    const taskId = idMatch![1];

    await runCLI(["run", taskId], env.tmpDir);

    // Check log files exist and contain the marker
    const logDir = join(env.tmpDir, ".local", "share", "reveille", "logs", taskId);
    const logFiles = readdirSync(logDir).filter((f) => f.endsWith(".stdout.log"));
    expect(logFiles.length).toBeGreaterThan(0);

    const logContent = readFileSync(join(logDir, logFiles[0]), "utf-8");
    expect(logContent).toContain(marker);
  });
});
