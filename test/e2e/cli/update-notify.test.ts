import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type TestEnv, createTestEnv } from "../../helpers/setup.js";
import { runCLI } from "../helpers/cli.js";

describe("update notifier E2E", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("does not show update notification in dev mode (--version)", async () => {
    const result = await runCLI(["--version"], env.tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("reveille v");
    // In dev mode, update notifier should not show anything
    expect(result.stderr).not.toContain("Update available");
  });

  it("suppresses update notification for 'run' command", async () => {
    // run without an ID will error, but update notification should still be suppressed
    const result = await runCLI(["run"], env.tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).not.toContain("Update available");
  });
});
