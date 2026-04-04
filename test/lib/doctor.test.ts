import { describe, it, expect } from "vitest";
import {
  type SystemEnv,
  type CheckResult,
  checkAgentBinaries,
  checkPathConfig,
  checkLaunchAgentsDir,
  checkPlistIntegrity,
  checkLaunchdState,
  checkConfiguration,
  checkBinPath,
  runAllChecks,
} from "../../src/lib/doctor.js";
import type { Task } from "../../src/lib/schema.js";

function createMockEnv(overrides: Partial<SystemEnv> = {}): SystemEnv {
  return {
    which: () => null,
    existsSync: () => false,
    readFileSync: () => null,
    readdirSync: () => [],
    execSync: () => null,
    getLoginShellPath: () => "/usr/bin:/bin:/usr/local/bin",
    getCurrentPath: () => "/usr/bin:/bin:/usr/local/bin",
    getHomedir: () => "/Users/testuser",
    getBinPath: () => "/usr/local/bin/reveille",
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "abc123",
    name: "Test Task",
    agent: "claude",
    command: 'claude -p "test"',
    workingDir: "/tmp",
    scheduleType: "cron",
    scheduleCron: "0 9 * * *",
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function findResult(results: CheckResult[], name: string): CheckResult | undefined {
  return results.find((r) => r.name === name);
}

describe("checkAgentBinaries", () => {
  it("should report pass for agents found on PATH", () => {
    const env = createMockEnv({
      which: (bin) => (bin === "claude" ? "/usr/local/bin/claude" : null),
    });
    const result = checkAgentBinaries(env);
    const claude = findResult(result.results, "claude");
    expect(claude).toBeDefined();
    expect(claude!.status).toBe("pass");
    expect(claude!.message).toContain("/usr/local/bin/claude");
  });

  it("should report warn for agents not found on PATH", () => {
    const env = createMockEnv({ which: () => null });
    const result = checkAgentBinaries(env);
    expect(result.results.length).toBe(4);
    for (const r of result.results) {
      expect(r.status).toBe("warn");
    }
  });
});

describe("checkPathConfig", () => {
  it("should report pass when login shell PATH matches current PATH", () => {
    const env = createMockEnv({
      getCurrentPath: () => "/usr/bin:/bin:/usr/local/bin",
      getLoginShellPath: () => "/usr/bin:/bin:/usr/local/bin",
    });
    const result = checkPathConfig(env);
    expect(result.results[0].status).toBe("pass");
  });

  it("should report warn when current PATH has dirs missing from login shell PATH", () => {
    const env = createMockEnv({
      getCurrentPath: () => "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
      getLoginShellPath: () => "/usr/bin:/bin:/usr/local/bin",
    });
    const result = checkPathConfig(env);
    const warn = result.results.find((r) => r.status === "warn");
    expect(warn).toBeDefined();
    expect(warn!.message).toContain("/opt/homebrew/bin");
  });
});

describe("checkLaunchAgentsDir", () => {
  it("should report pass when directory exists", () => {
    const env = createMockEnv({ existsSync: () => true });
    const result = checkLaunchAgentsDir(env);
    expect(result.results[0].status).toBe("pass");
  });

  it("should report fail when directory does not exist", () => {
    const env = createMockEnv({ existsSync: () => false });
    const result = checkLaunchAgentsDir(env);
    expect(result.results[0].status).toBe("fail");
  });
});

describe("checkPlistIntegrity", () => {
  it("should report pass when all enabled tasks have plist files", () => {
    const tasks = [makeTask({ id: "t1", enabled: true })];
    const env = createMockEnv({
      existsSync: (p) => p.includes("t1"),
      readdirSync: () => ["com.reveille.task.t1.plist"],
    });
    const result = checkPlistIntegrity(env, tasks);
    const check = findResult(result.results, "t1");
    expect(check).toBeDefined();
    expect(check!.status).toBe("pass");
  });

  it("should report fail when an enabled task is missing its plist", () => {
    const tasks = [makeTask({ id: "t1", enabled: true })];
    const env = createMockEnv({
      existsSync: () => false,
      readdirSync: () => [],
    });
    const result = checkPlistIntegrity(env, tasks);
    const check = findResult(result.results, "t1");
    expect(check).toBeDefined();
    expect(check!.status).toBe("fail");
  });

  it("should report warn for orphan plist files", () => {
    const tasks = [makeTask({ id: "t1", enabled: true })];
    const env = createMockEnv({
      existsSync: () => true,
      readdirSync: () => [
        "com.reveille.task.t1.plist",
        "com.reveille.task.orphan.plist",
      ],
    });
    const result = checkPlistIntegrity(env, tasks);
    const orphan = result.results.find((r) => r.status === "warn");
    expect(orphan).toBeDefined();
    expect(orphan!.message).toContain("orphan");
  });

  it("should skip disabled tasks", () => {
    const tasks = [makeTask({ id: "t1", enabled: false })];
    const env = createMockEnv({ readdirSync: () => [] });
    const result = checkPlistIntegrity(env, tasks);
    const check = findResult(result.results, "t1");
    expect(check).toBeUndefined();
  });
});

describe("checkLaunchdState", () => {
  it("should report pass when enabled tasks are loaded", () => {
    const tasks = [makeTask({ id: "t1", enabled: true })];
    const env = createMockEnv({
      execSync: (cmd) =>
        cmd.includes("com.reveille.task.t1") ? "loaded" : null,
    });
    const result = checkLaunchdState(env, tasks);
    const check = findResult(result.results, "t1");
    expect(check).toBeDefined();
    expect(check!.status).toBe("pass");
  });

  it("should report fail when enabled task is not loaded in launchctl", () => {
    const tasks = [makeTask({ id: "t1", enabled: true })];
    const env = createMockEnv({ execSync: () => null });
    const result = checkLaunchdState(env, tasks);
    const check = findResult(result.results, "t1");
    expect(check).toBeDefined();
    expect(check!.status).toBe("fail");
  });

  it("should report warn when disabled task is still loaded", () => {
    const tasks = [makeTask({ id: "t1", enabled: false })];
    const env = createMockEnv({
      execSync: (cmd) =>
        cmd.includes("com.reveille.task.t1") ? "loaded" : null,
    });
    const result = checkLaunchdState(env, tasks);
    const check = findResult(result.results, "t1");
    expect(check).toBeDefined();
    expect(check!.status).toBe("warn");
  });
});

describe("checkConfiguration", () => {
  it("should report pass when JSON files are valid", () => {
    const env = createMockEnv({
      existsSync: () => true,
      readFileSync: () => "[]",
    });
    const result = checkConfiguration(env);
    expect(result.results.every((r) => r.status === "pass")).toBe(true);
  });

  it("should report fail when tasks.json is corrupt", () => {
    const env = createMockEnv({
      existsSync: () => true,
      readFileSync: (p) => (p.includes("tasks") ? "not json{" : "[]"),
    });
    const result = checkConfiguration(env);
    const tasks = findResult(result.results, "tasks.json");
    expect(tasks).toBeDefined();
    expect(tasks!.status).toBe("fail");
  });

  it("should report warn when files do not exist yet", () => {
    const env = createMockEnv({
      existsSync: () => false,
      readFileSync: () => null,
    });
    const result = checkConfiguration(env);
    expect(result.results.some((r) => r.status === "warn")).toBe(true);
  });
});

describe("checkBinPath", () => {
  it("should report pass when reveille binary exists", () => {
    const env = createMockEnv({
      getBinPath: () => "/usr/local/bin/reveille",
      existsSync: () => true,
    });
    const result = checkBinPath(env);
    expect(result.results[0].status).toBe("pass");
  });

  it("should report warn when running in dev mode (tsx)", () => {
    const env = createMockEnv({
      getBinPath: () => "/Users/dev/project/node_modules/.bin/tsx",
      existsSync: () => true,
    });
    const result = checkBinPath(env);
    expect(result.results[0].status).toBe("warn");
  });
});

describe("runAllChecks", () => {
  it("should return all diagnostic categories", () => {
    const env = createMockEnv({
      existsSync: () => true,
      readFileSync: () => "[]",
      readdirSync: () => [],
    });
    const categories = runAllChecks(env, []);
    expect(categories.length).toBe(7);
    expect(categories.map((c) => c.category)).toEqual([
      "Agent Binaries",
      "PATH Configuration",
      "LaunchAgents Directory",
      "Plist Integrity",
      "Launchd State",
      "Configuration",
      "Binary Path",
    ]);
  });
});
