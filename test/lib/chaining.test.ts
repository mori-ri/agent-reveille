import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTask, updateTask } from "../../src/lib/tasks.js";
import { type TestEnv, createTestEnv } from "../helpers/setup.js";

// Mock executor to avoid spawning real processes
vi.mock("../../src/lib/executor.js", () => ({
  executeTask: vi.fn(),
}));

import { runDependentChain } from "../../src/lib/chaining.js";
import { executeTask } from "../../src/lib/executor.js";
import type { Execution } from "../../src/lib/schema.js";

const mockedExecuteTask = vi.mocked(executeTask);

function makeSuccessExecution(taskId: string, id = "exec-1"): Execution {
  return {
    id,
    taskId,
    startedAt: "2026-04-01T00:00:00.000Z",
    finishedAt: "2026-04-01T00:01:00.000Z",
    exitCode: 0,
    status: "success",
  };
}

function makeFailedExecution(taskId: string, id = "exec-1"): Execution {
  return {
    id,
    taskId,
    startedAt: "2026-04-01T00:00:00.000Z",
    finishedAt: "2026-04-01T00:01:00.000Z",
    exitCode: 1,
    status: "failed",
  };
}

describe("runDependentChain", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
    vi.clearAllMocks();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("should trigger dependent tasks after success", async () => {
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

    mockedExecuteTask.mockResolvedValueOnce(makeSuccessExecution(downstream.id, "exec-2"));

    await runDependentChain(upstream.id, "exec-1");

    expect(mockedExecuteTask).toHaveBeenCalledOnce();
    expect(mockedExecuteTask).toHaveBeenCalledWith(downstream.id, "exec-1");
  });

  it("should not trigger any tasks when there are no dependents", async () => {
    const standalone = createTask({
      name: "Standalone",
      agent: "custom",
      command: "echo standalone",
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    await runDependentChain(standalone.id, "exec-1");

    expect(mockedExecuteTask).not.toHaveBeenCalled();
  });

  it("should chain multiple levels: A → B → C", async () => {
    const a = createTask({
      name: "A",
      agent: "custom",
      command: "echo a",
      workingDir: "/tmp",
      scheduleType: "manual",
    });
    const b = createTask({
      name: "B",
      agent: "custom",
      command: "echo b",
      workingDir: "/tmp",
      scheduleType: "manual",
      afterTask: a.id,
    });
    const c = createTask({
      name: "C",
      agent: "custom",
      command: "echo c",
      workingDir: "/tmp",
      scheduleType: "manual",
      afterTask: b.id,
    });

    mockedExecuteTask
      .mockResolvedValueOnce(makeSuccessExecution(b.id, "exec-b"))
      .mockResolvedValueOnce(makeSuccessExecution(c.id, "exec-c"));

    await runDependentChain(a.id, "exec-a");

    expect(mockedExecuteTask).toHaveBeenCalledTimes(2);
    expect(mockedExecuteTask).toHaveBeenNthCalledWith(1, b.id, "exec-a");
    expect(mockedExecuteTask).toHaveBeenNthCalledWith(2, c.id, "exec-b");
  });

  it("should stop chain when a dependent fails", async () => {
    const a = createTask({
      name: "A",
      agent: "custom",
      command: "echo a",
      workingDir: "/tmp",
      scheduleType: "manual",
    });
    const b = createTask({
      name: "B",
      agent: "custom",
      command: "echo b",
      workingDir: "/tmp",
      scheduleType: "manual",
      afterTask: a.id,
    });
    createTask({
      name: "C",
      agent: "custom",
      command: "echo c",
      workingDir: "/tmp",
      scheduleType: "manual",
      afterTask: b.id,
    });

    mockedExecuteTask.mockResolvedValueOnce(makeFailedExecution(b.id, "exec-b"));

    await runDependentChain(a.id, "exec-a");

    // Only B was triggered; C was not because B failed
    expect(mockedExecuteTask).toHaveBeenCalledOnce();
  });

  it("should trigger multiple fan-out dependents", async () => {
    const upstream = createTask({
      name: "Upstream",
      agent: "custom",
      command: "echo",
      workingDir: "/tmp",
      scheduleType: "manual",
    });
    const dep1 = createTask({
      name: "Dep1",
      agent: "custom",
      command: "echo",
      workingDir: "/tmp",
      scheduleType: "manual",
      afterTask: upstream.id,
    });
    const dep2 = createTask({
      name: "Dep2",
      agent: "custom",
      command: "echo",
      workingDir: "/tmp",
      scheduleType: "manual",
      afterTask: upstream.id,
    });

    mockedExecuteTask
      .mockResolvedValueOnce(makeSuccessExecution(dep1.id, "exec-d1"))
      .mockResolvedValueOnce(makeSuccessExecution(dep2.id, "exec-d2"));

    await runDependentChain(upstream.id, "exec-up");

    expect(mockedExecuteTask).toHaveBeenCalledTimes(2);
  });

  it("should trigger disabled (paused) dependent tasks", async () => {
    const upstream = createTask({
      name: "Upstream",
      agent: "custom",
      command: "echo",
      workingDir: "/tmp",
      scheduleType: "cron",
      scheduleCron: "0 9 * * *",
    });
    const downstream = createTask({
      name: "Downstream",
      agent: "custom",
      command: "echo",
      workingDir: "/tmp",
      scheduleType: "cron",
      scheduleCron: "0 10 * * *",
      afterTask: upstream.id,
    });

    // Disable the downstream task (simulates `reveille disable`)
    updateTask(downstream.id, { enabled: false });

    mockedExecuteTask.mockResolvedValueOnce(makeSuccessExecution(downstream.id, "exec-d"));

    await runDependentChain(upstream.id, "exec-up");

    // Disabled tasks should still be triggered via chain
    expect(mockedExecuteTask).toHaveBeenCalledOnce();
    expect(mockedExecuteTask).toHaveBeenCalledWith(downstream.id, "exec-up");
  });
});
