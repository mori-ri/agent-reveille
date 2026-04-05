import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createTestEnv, type TestEnv } from "../helpers/setup.js";
import {
  loadTask,
  loadTasks,
  saveTask,
  deleteTaskFile,
  loadTaskExecutions,
  saveTaskExecutions,
  loadAllExecutions,
  deleteTaskExecutions,
  migrateIfNeeded,
} from "../../src/lib/db.js";
import { getTasksDir, getTaskFilePath, getTasksFilePath, getExecutionsFilePath } from "../../src/lib/paths.js";
import type { Task, Execution } from "../../src/lib/schema.js";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "test-123",
    name: "Test Task",
    agent: "claude",
    command: "review this code",
    workingDir: "/tmp",
    scheduleType: "manual",
    enabled: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeExecution(overrides: Partial<Execution> = {}): Execution {
  return {
    id: "exec-1",
    taskId: "test-123",
    startedAt: "2026-04-01T00:00:00.000Z",
    status: "success",
    ...overrides,
  };
}

describe("db - task serialization", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("should save and load a task as markdown with frontmatter", () => {
    const task = makeTask();
    saveTask(task);

    const loaded = loadTask("test-123");
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe("test-123");
    expect(loaded!.name).toBe("Test Task");
    expect(loaded!.agent).toBe("claude");
    expect(loaded!.command).toBe("review this code");
    expect(loaded!.workingDir).toBe("/tmp");
  });

  it("should store command as markdown body, not in frontmatter", () => {
    const task = makeTask({ command: "check for security issues\n\nbe thorough" });
    saveTask(task);

    const raw = readFileSync(getTaskFilePath("test-123"), "utf-8");
    // Body should contain the command text
    expect(raw).toContain("check for security issues");
    expect(raw).toContain("be thorough");
    // Frontmatter should NOT contain command
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).not.toBeNull();
    expect(frontmatterMatch![1]).not.toContain("command");
  });

  it("should derive id from filename, not store in frontmatter", () => {
    const task = makeTask();
    saveTask(task);

    const raw = readFileSync(getTaskFilePath("test-123"), "utf-8");
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch![1]).not.toContain("id:");
  });

  it("should preserve multiline commands through roundtrip", () => {
    const multilineCommand = `src/以下の変更を確認して、以下の観点でレビューしてください：

1. セキュリティ上の問題がないか
2. パフォーマンスに影響がないか
3. テストカバレッジが足りているか

問題があればIssueを作成してください。`;

    const task = makeTask({ command: multilineCommand });
    saveTask(task);

    const loaded = loadTask("test-123");
    expect(loaded!.command).toBe(multilineCommand);
  });

  it("should preserve optional fields through roundtrip", () => {
    const task = makeTask({
      scheduleCron: "0 9 * * *",
      model: "opus",
      scheduleType: "cron",
      enabled: true,
    });
    saveTask(task);

    const loaded = loadTask("test-123");
    expect(loaded!.scheduleCron).toBe("0 9 * * *");
    expect(loaded!.model).toBe("opus");
    expect(loaded!.scheduleType).toBe("cron");
    expect(loaded!.enabled).toBe(true);
  });

  it("should return null for non-existent task", () => {
    expect(loadTask("nonexistent")).toBeNull();
  });

  it("should warn and return null for invalid frontmatter", () => {
    const taskPath = getTaskFilePath("bad-task");
    writeFileSync(taskPath, "---\nname: 123\n---\nsome body", "utf-8");

    const loaded = loadTask("bad-task");
    expect(loaded).toBeNull();
  });
});

describe("db - loadTasks", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("should return empty array when no tasks exist", () => {
    expect(loadTasks()).toEqual([]);
  });

  it("should load all tasks from directory", () => {
    saveTask(makeTask({ id: "task-a", name: "A", createdAt: "2026-04-01T00:00:00.000Z" }));
    saveTask(makeTask({ id: "task-b", name: "B", createdAt: "2026-04-02T00:00:00.000Z" }));

    const tasks = loadTasks();
    expect(tasks).toHaveLength(2);
    const names = tasks.map((t) => t.name);
    expect(names).toContain("A");
    expect(names).toContain("B");
  });

  it("should sort tasks by createdAt", () => {
    saveTask(makeTask({ id: "newer", name: "Newer", createdAt: "2026-04-02T00:00:00.000Z" }));
    saveTask(makeTask({ id: "older", name: "Older", createdAt: "2026-04-01T00:00:00.000Z" }));

    const tasks = loadTasks();
    expect(tasks[0].name).toBe("Older");
    expect(tasks[1].name).toBe("Newer");
  });

  it("should skip invalid files", () => {
    saveTask(makeTask({ id: "good" }));
    writeFileSync(getTaskFilePath("bad"), "not valid frontmatter at all", "utf-8");

    const tasks = loadTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe("good");
  });
});

describe("db - deleteTaskFile", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("should delete the task file", () => {
    saveTask(makeTask());
    expect(existsSync(getTaskFilePath("test-123"))).toBe(true);

    deleteTaskFile("test-123");
    expect(existsSync(getTaskFilePath("test-123"))).toBe(false);
  });
});

describe("db - per-task executions", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("should return empty array when no executions exist", () => {
    expect(loadTaskExecutions("nonexistent")).toEqual([]);
  });

  it("should save and load executions per task", () => {
    const exec1 = makeExecution({ id: "e1", taskId: "task-a" });
    const exec2 = makeExecution({ id: "e2", taskId: "task-a" });
    saveTaskExecutions("task-a", [exec1, exec2]);

    const loaded = loadTaskExecutions("task-a");
    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe("e1");
  });

  it("should isolate executions between tasks", () => {
    saveTaskExecutions("task-a", [makeExecution({ id: "e1", taskId: "task-a" })]);
    saveTaskExecutions("task-b", [makeExecution({ id: "e2", taskId: "task-b" })]);

    expect(loadTaskExecutions("task-a")).toHaveLength(1);
    expect(loadTaskExecutions("task-b")).toHaveLength(1);
  });

  it("should load all executions across tasks", () => {
    saveTaskExecutions("task-a", [makeExecution({ id: "e1", taskId: "task-a" })]);
    saveTaskExecutions("task-b", [makeExecution({ id: "e2", taskId: "task-b" })]);

    const all = loadAllExecutions();
    expect(all).toHaveLength(2);
  });

  it("should delete executions for a task", () => {
    saveTaskExecutions("task-a", [makeExecution()]);
    deleteTaskExecutions("task-a");

    expect(loadTaskExecutions("task-a")).toEqual([]);
  });
});

describe("db - migration", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("should migrate tasks.json to individual markdown files", () => {
    const oldTasks = [
      {
        id: "migrate-1",
        name: "Old Task",
        agent: "custom",
        command: "echo hello",
        workingDir: "/tmp",
        scheduleType: "manual",
        enabled: false,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ];
    writeFileSync(getTasksFilePath(), JSON.stringify(oldTasks), "utf-8");

    migrateIfNeeded();

    const loaded = loadTask("migrate-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe("Old Task");
    expect(loaded!.command).toBe("echo hello");
  });

  it("should migrate executions.json to per-task files", () => {
    const oldTasks = [
      {
        id: "t1",
        name: "T1",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
        enabled: false,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ];
    const oldExecs = [
      { id: "e1", taskId: "t1", startedAt: "2026-04-01T00:00:00.000Z", status: "success" },
      { id: "e2", taskId: "t1", startedAt: "2026-04-01T01:00:00.000Z", status: "failed" },
    ];
    writeFileSync(getTasksFilePath(), JSON.stringify(oldTasks), "utf-8");
    writeFileSync(getExecutionsFilePath(), JSON.stringify(oldExecs), "utf-8");

    migrateIfNeeded();

    const execs = loadTaskExecutions("t1");
    expect(execs).toHaveLength(2);
  });

  it("should rename old files to .bak after migration", () => {
    writeFileSync(getTasksFilePath(), "[]", "utf-8");
    writeFileSync(getExecutionsFilePath(), "[]", "utf-8");

    migrateIfNeeded();

    expect(existsSync(getTasksFilePath())).toBe(false);
    expect(existsSync(getTasksFilePath() + ".bak")).toBe(true);
    expect(existsSync(getExecutionsFilePath() + ".bak")).toBe(true);
  });

  it("should not migrate if tasks.json does not exist", () => {
    // No old files — should not crash
    migrateIfNeeded();
    expect(loadTasks()).toEqual([]);
  });

  it("should be idempotent", () => {
    const oldTasks = [
      {
        id: "idem-1",
        name: "Idempotent",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
        enabled: false,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ];
    writeFileSync(getTasksFilePath(), JSON.stringify(oldTasks), "utf-8");

    migrateIfNeeded();
    migrateIfNeeded(); // second call should be a no-op

    expect(loadTasks()).toHaveLength(1);
  });

  it("should extract prompt from known agent commands during migration", () => {
    const oldTasks = [
      {
        id: "claude-task",
        name: "Claude Task",
        agent: "claude",
        command: 'claude -p "review the code carefully" --dangerously-skip-permissions',
        workingDir: "/tmp",
        scheduleType: "manual",
        enabled: false,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ];
    writeFileSync(getTasksFilePath(), JSON.stringify(oldTasks), "utf-8");

    migrateIfNeeded();

    const loaded = loadTask("claude-task");
    expect(loaded).not.toBeNull();
    expect(loaded!.command).toBe("review the code carefully");
  });
});
