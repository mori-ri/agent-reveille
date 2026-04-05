import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDiagnostics } from "../../src/lib/doctor.js";
import { createTask } from "../../src/lib/tasks.js";
import { type TestEnv, createTestEnv } from "../helpers/setup.js";

describe("doctor diagnostics", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("returns a valid DiagnosticReport structure", () => {
    const report = runDiagnostics();
    expect(report).toHaveProperty("checks");
    expect(report).toHaveProperty("hasFail");
    expect(report).toHaveProperty("hasWarn");
    expect(Array.isArray(report.checks)).toBe(true);
    expect(typeof report.hasFail).toBe("boolean");
    expect(typeof report.hasWarn).toBe("boolean");
  });

  it("includes checks for each agent preset", () => {
    const report = runDiagnostics();
    const agentChecks = report.checks.filter((c) => c.name.startsWith("agent-"));
    expect(agentChecks).toHaveLength(4); // claude, codex, gemini, aider
    for (const check of agentChecks) {
      expect(["pass", "warn"]).toContain(check.status);
    }
  });

  it("returns pass for directories in test environment", () => {
    const report = runDiagnostics();
    const dirChecks = report.checks.filter((c) => c.name.startsWith("dir-"));
    expect(dirChecks.length).toBeGreaterThanOrEqual(3);
    for (const check of dirChecks) {
      expect(check.status).toBe("pass");
    }
  });

  it("returns pass for launchctl when REVEILLE_SKIP_LAUNCHCTL is set", () => {
    const report = runDiagnostics();
    const launchctlCheck = report.checks.find((c) => c.name === "launchctl");
    expect(launchctlCheck).toBeDefined();
    expect(launchctlCheck?.status).toBe("pass");
    expect(launchctlCheck?.message).toContain("skipped");
  });

  it("returns no task checks when no tasks exist", () => {
    const report = runDiagnostics();
    const taskChecks = report.checks.filter((c) => c.name.startsWith("task-"));
    expect(taskChecks).toHaveLength(0);
  });

  it("returns fail for task with missing working directory", () => {
    createTask({
      name: "Bad Task",
      agent: "custom",
      command: "echo test",
      workingDir: "/nonexistent/path/abc123xyz",
      scheduleType: "manual",
    });

    const report = runDiagnostics();
    const workdirCheck = report.checks.find(
      (c) => c.name.includes("workdir") && c.status === "fail",
    );
    expect(workdirCheck).toBeDefined();
    expect(workdirCheck?.message).toContain("Working directory missing");
    expect(report.hasFail).toBe(true);
  });

  it("returns pass for task with existing working directory", () => {
    createTask({
      name: "Good Task",
      agent: "custom",
      command: "echo test",
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    const report = runDiagnostics();
    const workdirCheck = report.checks.find(
      (c) => c.name.includes("workdir") && c.status === "pass",
    );
    expect(workdirCheck).toBeDefined();
    expect(workdirCheck?.message).toContain("Working directory exists");
  });

  it("returns fail for enabled task without plist file", () => {
    createTask({
      name: "No Plist Task",
      agent: "claude",
      command: "echo test",
      workingDir: "/tmp",
      scheduleType: "cron",
      scheduleCron: "0 9 * * *",
    });

    const report = runDiagnostics();
    const plistCheck = report.checks.find((c) => c.name.includes("plist") && c.status === "fail");
    expect(plistCheck).toBeDefined();
    expect(plistCheck?.message).toContain("Plist file missing");
  });

  it("hasFail is false when all checks pass or warn", () => {
    // No tasks, only system checks — should all be pass or warn
    const report = runDiagnostics();
    // Remove agent checks that may be warn
    const failChecks = report.checks.filter((c) => c.status === "fail");
    if (failChecks.length === 0) {
      expect(report.hasFail).toBe(false);
    }
  });
});
