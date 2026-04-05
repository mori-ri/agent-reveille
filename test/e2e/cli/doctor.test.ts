import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type TestEnv, createTestEnv } from "../../helpers/setup.js";
import { runCLI } from "../helpers/cli.js";

describe("CLI doctor", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("runs doctor with exit code 0 when no tasks exist", async () => {
    const result = await runCLI(["doctor"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("reveille doctor");
    expect(result.stdout).toContain("passed");
  });

  it("shows agent check results", async () => {
    const result = await runCLI(["doctor"], env.tmpDir);
    // Should mention at least one agent
    expect(result.stdout).toMatch(/Claude Code|Codex CLI|Gemini CLI|Aider/);
  });

  it("shows directory checks", async () => {
    const result = await runCLI(["doctor"], env.tmpDir);
    expect(result.stdout).toContain("Config");
    expect(result.stdout).toContain("Data");
    expect(result.stdout).toContain("LaunchAgents");
  });

  it("exits with code 1 when a task has issues", async () => {
    // Create a task with nonexistent working directory
    const addResult = await runCLI(
      ["add", "--name", "Bad Task", "--cmd", "echo test", "--dir", "/nonexistent/path/abc123xyz"],
      env.tmpDir,
    );
    expect(addResult.exitCode).toBe(0);

    const result = await runCLI(["doctor"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Working directory missing");
    expect(result.stdout).toContain("issue(s) found");
  });

  it("doctor appears in help output", async () => {
    const result = await runCLI(["--help"], env.tmpDir);
    expect(result.stdout).toContain("doctor");
    expect(result.stdout).toContain("Diagnose common issues");
  });
});
