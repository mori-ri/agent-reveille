import { describe, expect, it } from "vitest";
import { CreateTaskInput, ExecutionSchema, TaskSchema } from "../../src/lib/schema.js";

describe("TaskSchema model field", () => {
  const baseTask = {
    id: "abc123",
    name: "Test",
    agent: "claude" as const,
    command: 'claude -p "test"',
    workingDir: "/tmp",
    scheduleType: "manual" as const,
    enabled: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  };

  it("should accept task without model", () => {
    const result = TaskSchema.safeParse(baseTask);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBeUndefined();
    }
  });

  it("should accept task with model", () => {
    const result = TaskSchema.safeParse({ ...baseTask, model: "opus" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe("opus");
    }
  });
});

describe("CreateTaskInput model field", () => {
  const baseInput = {
    name: "Test",
    agent: "claude" as const,
    command: 'claude -p "test"',
    workingDir: "/tmp",
    scheduleType: "manual" as const,
  };

  it("should accept input without model", () => {
    const result = CreateTaskInput.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("should accept input with model", () => {
    const result = CreateTaskInput.safeParse({ ...baseInput, model: "sonnet" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe("sonnet");
    }
  });
});

describe("TaskSchema afterTask field", () => {
  const baseTask = {
    id: "abc123",
    name: "Test",
    agent: "claude" as const,
    command: "test",
    workingDir: "/tmp",
    scheduleType: "manual" as const,
    enabled: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  };

  it("should accept task without afterTask", () => {
    const result = TaskSchema.safeParse(baseTask);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.afterTask).toBeUndefined();
    }
  });

  it("should accept task with afterTask", () => {
    const result = TaskSchema.safeParse({ ...baseTask, afterTask: "other-task-id" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.afterTask).toBe("other-task-id");
    }
  });
});

describe("CreateTaskInput afterTask field", () => {
  const baseInput = {
    name: "Test",
    agent: "claude" as const,
    command: "test",
    workingDir: "/tmp",
    scheduleType: "manual" as const,
  };

  it("should accept input without afterTask", () => {
    const result = CreateTaskInput.safeParse(baseInput);
    expect(result.success).toBe(true);
  });

  it("should accept input with afterTask", () => {
    const result = CreateTaskInput.safeParse({ ...baseInput, afterTask: "dep-id" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.afterTask).toBe("dep-id");
    }
  });
});

describe("ExecutionSchema triggeredBy field", () => {
  const baseExec = {
    id: "exec-1",
    taskId: "task-1",
    startedAt: "2025-01-01T00:00:00Z",
    status: "success" as const,
  };

  it("should accept execution without triggeredBy", () => {
    const result = ExecutionSchema.safeParse(baseExec);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.triggeredBy).toBeUndefined();
    }
  });

  it("should accept execution with triggeredBy", () => {
    const result = ExecutionSchema.safeParse({ ...baseExec, triggeredBy: "exec-0" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.triggeredBy).toBe("exec-0");
    }
  });
});
