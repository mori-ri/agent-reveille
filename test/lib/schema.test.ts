import { describe, it, expect } from "vitest";
import { TaskSchema, CreateTaskInput } from "../../src/lib/schema.js";

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
