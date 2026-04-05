import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTask, deleteTask, getTask, listTasks, updateTask } from "../../src/lib/tasks.js";
import { type TestEnv, createTestEnv } from "../helpers/setup.js";

describe("tasks", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("should create a task", () => {
    const task = createTask({
      name: "Test",
      agent: "claude",
      command: "test prompt",
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
    expect(found?.name).toBe("Find me");
  });

  it("should list all tasks", () => {
    createTask({
      name: "A",
      agent: "custom",
      command: "a",
      workingDir: "/tmp",
      scheduleType: "manual",
    });
    createTask({
      name: "B",
      agent: "custom",
      command: "b",
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    const all = listTasks();
    expect(all).toHaveLength(2);
  });

  it("should update a task", () => {
    const task = createTask({
      name: "Old",
      agent: "custom",
      command: "x",
      workingDir: "/tmp",
      scheduleType: "manual",
    });
    const updated = updateTask(task.id, { name: "New" });

    expect(updated.name).toBe("New");
    expect(getTask(task.id)?.name).toBe("New");
  });

  it("should delete a task", () => {
    const task = createTask({
      name: "Gone",
      agent: "custom",
      command: "x",
      workingDir: "/tmp",
      scheduleType: "manual",
    });
    deleteTask(task.id);

    expect(getTask(task.id)).toBeNull();
  });

  it("should throw when deleting non-existent task", () => {
    expect(() => deleteTask("nonexistent")).toThrow("Task not found");
  });

  it("should create a task with model", () => {
    const task = createTask({
      name: "Model Test",
      agent: "claude",
      command: "test prompt",
      workingDir: "/tmp",
      scheduleType: "manual",
      model: "opus",
    });

    expect(task.model).toBe("opus");
    const found = getTask(task.id);
    expect(found?.model).toBe("opus");
  });

  it("should create a task without model", () => {
    const task = createTask({
      name: "No Model",
      agent: "claude",
      command: "test prompt",
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    expect(task.model).toBeUndefined();
  });
});
