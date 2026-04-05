import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditWizard } from "../../../src/commands/edit.js";
import type { Task } from "../../../src/lib/schema.js";
import { createTask } from "../../../src/lib/tasks.js";
import { type TestEnv, createTestEnv } from "../../helpers/setup.js";

const tick = () => new Promise((r) => setTimeout(r, 50));

describe("EditWizard component", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  function createTestTask(overrides: Partial<Task> = {}): Task {
    return createTask({
      name: "Test Task",
      agent: "claude",
      command: "fix the bug",
      workingDir: "/tmp",
      scheduleType: "cron",
      scheduleCron: "0 9 * * *",
      ...overrides,
    });
  }

  async function pressEnter(stdin: { write: (data: string) => void }) {
    stdin.write("\r");
    await tick();
  }

  it("renders with task name in header", () => {
    const task = createTestTask();
    const { lastFrame } = render(<EditWizard task={task} />);
    expect(lastFrame()).toContain("Edit Task: Test Task");
  });

  it("starts on name step with current value pre-filled", () => {
    const task = createTestTask();
    const { lastFrame } = render(<EditWizard task={task} />);
    expect(lastFrame()).toContain("Task name:");
    expect(lastFrame()).toContain("Test Task");
  });

  it("shows model step for agent tasks after name", async () => {
    const task = createTestTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);
    await tick(); // Let component initialize
    await pressEnter(stdin);
    expect(lastFrame()).toContain("Model");
  });

  it("skips model step for custom agent tasks", async () => {
    const task = createTestTask({ agent: "custom", command: "echo hello" });
    const { lastFrame, stdin } = render(<EditWizard task={task} />);
    await tick();
    await pressEnter(stdin);
    expect(lastFrame()).toContain("Command:");
  });

  it("shows prompt step for agent tasks with command preview", async () => {
    const task = createTestTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);
    await tick();
    await pressEnter(stdin); // name
    await pressEnter(stdin); // model
    expect(lastFrame()).toContain("Prompt for claude:");
    expect(lastFrame()).toContain("fix the bug");
  });

  it("shows confirm step with summary", async () => {
    const task = createTestTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);
    await tick();
    await pressEnter(stdin); // name
    await pressEnter(stdin); // model
    await pressEnter(stdin); // prompt
    await pressEnter(stdin); // workdir
    await pressEnter(stdin); // schedule-type (select → cron)
    await pressEnter(stdin); // schedule-value
    const frame = lastFrame();
    expect(frame).toContain("Summary:");
    expect(frame).toContain("Test Task");
    expect(frame).toContain("claude");
  });

  it("shows after-task step when other tasks exist", async () => {
    createTestTask({ name: "First Task" });
    const secondTask = createTestTask({ name: "Second Task" });
    const { lastFrame, stdin } = render(<EditWizard task={secondTask} />);
    await tick();
    await pressEnter(stdin); // name
    await pressEnter(stdin); // model
    await pressEnter(stdin); // prompt
    await pressEnter(stdin); // workdir
    await pressEnter(stdin); // schedule-type
    await pressEnter(stdin); // schedule-value
    expect(lastFrame()).toContain("Run after another task?");
    expect(lastFrame()).toContain("First Task");
  });

  it("displays model with pre-filled value", async () => {
    const task = createTestTask({ model: "opus" });
    const { lastFrame, stdin } = render(<EditWizard task={task} />);
    await tick();
    await pressEnter(stdin);
    expect(lastFrame()).toContain("Model");
    expect(lastFrame()).toContain("opus");
  });

  it("calls onCancel when Escape is pressed on first step", async () => {
    const task = createTestTask();
    let cancelled = false;
    const { stdin } = render(
      <EditWizard
        task={task}
        onCancel={() => {
          cancelled = true;
        }}
      />,
    );
    await tick();
    stdin.write("\x1B");
    await tick();
    expect(cancelled).toBe(true);
  });

  it("goes back to previous step on Escape", async () => {
    const task = createTestTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);
    await tick();
    await pressEnter(stdin); // name → model
    expect(lastFrame()).toContain("Model");
    stdin.write("\x1B");
    await tick();
    expect(lastFrame()).toContain("Task name:");
  });
});
