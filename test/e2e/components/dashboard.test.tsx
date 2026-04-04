import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "ink-testing-library";
import { Dashboard } from "../../../src/commands/dashboard.js";
import { createTask } from "../../../src/lib/tasks.js";
import { createTestEnv, type TestEnv } from "../../helpers/setup.js";

describe("Dashboard component", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("displays empty state when no tasks exist", () => {
    const { lastFrame } = render(<Dashboard />);
    const frame = lastFrame()!;
    expect(frame).toContain("No tasks");
  });

  it("displays help bar with keybindings", () => {
    const { lastFrame } = render(<Dashboard />);
    const frame = lastFrame()!;
    expect(frame).toContain("j/k");
    expect(frame).toContain("quit");
  });

  it("displays task list when tasks exist", () => {
    createTask({
      name: "Test Task",
      agent: "custom",
      command: "echo hello",
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    const { lastFrame } = render(<Dashboard />);
    const frame = lastFrame()!;
    expect(frame).toContain("Test Task");
    expect(frame).toContain("custom");
  });

  it("shows selection indicator on first task", () => {
    createTask({
      name: "First Task",
      agent: "custom",
      command: "echo first",
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    const { lastFrame } = render(<Dashboard />);
    expect(lastFrame()).toContain("❯");
  });

  it("displays multiple tasks in list", () => {
    createTask({
      name: "Task One",
      agent: "custom",
      command: "echo one",
      workingDir: "/tmp",
      scheduleType: "manual",
    });
    createTask({
      name: "Task Two",
      agent: "custom",
      command: "echo two",
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    const { lastFrame } = render(<Dashboard />);
    const frame = lastFrame()!;

    // Both tasks should be visible in the list
    expect(frame).toContain("Task One");
    expect(frame).toContain("Task Two");
    // Detail panel shows first task by default
    expect(frame).toContain("echo one");
  });

  it("displays detail panel for selected task", () => {
    createTask({
      name: "Detailed Task",
      agent: "custom",
      command: "echo detailed",
      workingDir: "/tmp/test",
      scheduleType: "manual",
    });

    const { lastFrame } = render(<Dashboard />);
    const frame = lastFrame()!;
    expect(frame).toContain("Detailed Task");
    expect(frame).toContain("echo detailed");
    expect(frame).toContain("/tmp/test");
  });
});
