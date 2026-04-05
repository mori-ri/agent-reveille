import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type TestEnv, createTestEnv } from "../../helpers/setup.js";
import { runCLI } from "../helpers/cli.js";

describe("CLI error handling", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("shows error for unknown command", async () => {
    const result = await runCLI(["foobar"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });

  it("shows usage when run is called without ID", async () => {
    const result = await runCLI(["run"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Usage");
  });

  it("shows error when running nonexistent task", async () => {
    const result = await runCLI(["run", "nonexistent"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Task not found");
  });

  it("shows usage when remove is called without ID", async () => {
    const result = await runCLI(["remove"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Usage");
  });

  it("shows error when removing nonexistent task", async () => {
    const result = await runCLI(["remove", "nonexistent"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Task not found");
  });

  it("displays version", async () => {
    const result = await runCLI(["--version"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("reveille v");
  });

  it("displays help", async () => {
    const result = await runCLI(["--help"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage");
    expect(result.stdout).toContain("Commands");
  });
});
