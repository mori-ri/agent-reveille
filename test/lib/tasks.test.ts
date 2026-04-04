import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTask, getTask, listTasks, updateTask, deleteTask } from "../../src/lib/tasks.js";
import { getTasksFilePath, getExecutionsFilePath } from "../../src/lib/paths.js";
import { writeFileSync } from "node:fs";
import { createTestEnv, type TestEnv } from "../helpers/setup.js";

describe("tasks", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();

    const tasksPath = getTasksFilePath();
    const execsPath = getExecutionsFilePath();
    writeFileSync(tasksPath, "[]", "utf-8");
    writeFileSync(execsPath, "[]", "utf-8");
  });

  afterEach(() => {
    env.cleanup();
  });

  it("should create a task", () => {
    const task = createTask({
      name: "Test",
      agent: "claude",
      command: 'claude -p "test"',
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    expect(task.id).toBeDefined();
    expect(task.name).toBe("Test");
    expect(task.agent).toBe("claude");
  });

  it("should get a task by id", () => {
    const created = createTask({
      name: "Find me",
      agent: "custom",
      command: "echo hi",
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    const found = getTask(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Find me");
  });

  it("should list all tasks", () => {
    createTask({ name: "A", agent: "custom", command: "a", workingDir: "/tmp", scheduleType: "manual" });
    createTask({ name: "B", agent: "custom", command: "b", workingDir: "/tmp", scheduleType: "manual" });

    const all = listTasks();
    expect(all).toHaveLength(2);
  });

  it("should update a task", () => {
    const task = createTask({ name: "Old", agent: "custom", command: "x", workingDir: "/tmp", scheduleType: "manual" });
    const updated = updateTask(task.id, { name: "New" });

    expect(updated.name).toBe("New");
    expect(getTask(task.id)!.name).toBe("New");
  });

  it("should delete a task", () => {
    const task = createTask({ name: "Gone", agent: "custom", command: "x", workingDir: "/tmp", scheduleType: "manual" });
    deleteTask(task.id);

    expect(getTask(task.id)).toBeNull();
  });

  it("should throw when deleting non-existent task", () => {
    expect(() => deleteTask("nonexistent")).toThrow("Task not found");
  });
});
