import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTask,
  deleteTask,
  getDependentTasks,
  getTask,
  listTasks,
  updateTask,
} from "../../src/lib/tasks.js";
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

  describe("afterTask (task chaining)", () => {
    it("should create a task with afterTask", () => {
      const upstream = createTask({
        name: "Upstream",
        agent: "custom",
        command: "echo upstream",
        workingDir: "/tmp",
        scheduleType: "manual",
      });

      const downstream = createTask({
        name: "Downstream",
        agent: "custom",
        command: "echo downstream",
        workingDir: "/tmp",
        scheduleType: "manual",
        afterTask: upstream.id,
      });

      expect(downstream.afterTask).toBe(upstream.id);
      const found = getTask(downstream.id);
      expect(found?.afterTask).toBe(upstream.id);
    });

    it("should reject afterTask referencing non-existent task", () => {
      expect(() =>
        createTask({
          name: "Bad",
          agent: "custom",
          command: "echo",
          workingDir: "/tmp",
          scheduleType: "manual",
          afterTask: "nonexistent",
        }),
      ).toThrow("afterTask not found");
    });

    it("should reject self-referencing afterTask on update", () => {
      const task = createTask({
        name: "Self",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
      });

      expect(() => updateTask(task.id, { afterTask: task.id })).toThrow("cannot depend on itself");
    });

    it("should reject circular dependency A→B→A", () => {
      const a = createTask({
        name: "A",
        agent: "custom",
        command: "a",
        workingDir: "/tmp",
        scheduleType: "manual",
      });
      const b = createTask({
        name: "B",
        agent: "custom",
        command: "b",
        workingDir: "/tmp",
        scheduleType: "manual",
        afterTask: a.id,
      });

      expect(() => updateTask(a.id, { afterTask: b.id })).toThrow("Circular dependency");
    });

    it("should reject circular dependency A→B→C→A", () => {
      const a = createTask({
        name: "A",
        agent: "custom",
        command: "a",
        workingDir: "/tmp",
        scheduleType: "manual",
      });
      const b = createTask({
        name: "B",
        agent: "custom",
        command: "b",
        workingDir: "/tmp",
        scheduleType: "manual",
        afterTask: a.id,
      });
      const _c = createTask({
        name: "C",
        agent: "custom",
        command: "c",
        workingDir: "/tmp",
        scheduleType: "manual",
        afterTask: b.id,
      });

      expect(() => updateTask(a.id, { afterTask: _c.id })).toThrow("Circular dependency");
    });

    it("should clear afterTask on dependents when upstream is deleted", () => {
      const upstream = createTask({
        name: "Upstream",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
      });
      const downstream = createTask({
        name: "Downstream",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
        afterTask: upstream.id,
      });

      deleteTask(upstream.id);

      const found = getTask(downstream.id);
      expect(found?.afterTask).toBeUndefined();
    });

    it("should return dependent tasks via getDependentTasks", () => {
      const upstream = createTask({
        name: "Upstream",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
      });
      createTask({
        name: "Dep1",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
        afterTask: upstream.id,
      });
      createTask({
        name: "Dep2",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
        afterTask: upstream.id,
      });
      createTask({
        name: "Unrelated",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
      });

      const deps = getDependentTasks(upstream.id);
      expect(deps).toHaveLength(2);
      expect(deps.map((d) => d.name).sort()).toEqual(["Dep1", "Dep2"]);
    });

    it("should allow clearing afterTask via update", () => {
      const upstream = createTask({
        name: "Upstream",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
      });
      const downstream = createTask({
        name: "Downstream",
        agent: "custom",
        command: "echo",
        workingDir: "/tmp",
        scheduleType: "manual",
        afterTask: upstream.id,
      });

      const updated = updateTask(downstream.id, { afterTask: undefined });
      expect(updated.afterTask).toBeUndefined();
    });
  });
});
