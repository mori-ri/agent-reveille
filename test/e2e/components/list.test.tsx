import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "ink-testing-library";
import { TaskList } from "../../../src/commands/list.js";
import { createTask } from "../../../src/lib/tasks.js";
import { createTestEnv, type TestEnv } from "../../helpers/setup.js";

describe("TaskList component", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("displays empty state message when no tasks exist", () => {
    const { lastFrame } = render(<TaskList />);
    expect(lastFrame()).toContain("No tasks configured");
  });

  it("displays task table when tasks exist", () => {
    createTask({
      name: "Daily Report",
      agent: "claude",
      command: 'claude -p "generate report"',
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    const { lastFrame } = render(<TaskList />);
    const frame = lastFrame()!;
    expect(frame).toContain("Daily Report");
    expect(frame).toContain("claude");
    expect(frame).toContain("1 task(s)");
  });

  it("displays multiple tasks", () => {
    createTask({
      name: "Task A",
      agent: "custom",
      command: "echo a",
      workingDir: "/tmp",
      scheduleType: "manual",
    });
    createTask({
      name: "Task B",
      agent: "custom",
      command: "echo b",
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    const { lastFrame } = render(<TaskList />);
    const frame = lastFrame()!;
    expect(frame).toContain("Task A");
    expect(frame).toContain("Task B");
    expect(frame).toContain("2 task(s)");
  });

  it("displays table headers", () => {
    createTask({
      name: "Test",
      agent: "custom",
      command: "echo test",
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    const { lastFrame } = render(<TaskList />);
    const frame = lastFrame()!;
    expect(frame).toContain("ID");
    expect(frame).toContain("NAME");
    expect(frame).toContain("AGENT");
    expect(frame).toContain("SCHEDULE");
    expect(frame).toContain("STATUS");
    expect(frame).toContain("LAST RUN");
  });
});
