import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "ink-testing-library";
import { EditWizard } from "../../../src/commands/edit.js";
import { createTask } from "../../../src/lib/tasks.js";
import { createTestEnv, type TestEnv } from "../../helpers/setup.js";
import type { Task } from "../../../src/lib/schema.js";

/**
 * Wait for a frame that satisfies the condition, polling every 20ms.
 */
async function waitFor(
  lastFrame: () => string | undefined,
  condition: (frame: string) => boolean,
  maxWait = 2000,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const frame = lastFrame();
    if (frame && condition(frame)) return frame;
    await new Promise((r) => setTimeout(r, 20));
  }
  return lastFrame() ?? "";
}

/**
 * Submit step by writing Enter, then wait for the expected content to appear.
 * Includes a pre-write delay to allow ink's useInput hook to register on the new step.
 */
async function submitAndWaitFor(
  stdin: { write: (data: string) => void },
  lastFrame: () => string | undefined,
  expectedContent: string,
): Promise<string> {
  // Allow ink to register input handlers for the newly mounted TextInput
  await new Promise((r) => setTimeout(r, 100));
  stdin.write("\r");
  return waitFor(lastFrame, (f) => f.includes(expectedContent));
}

describe("EditWizard component", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  function createAgentTask(overrides?: Partial<Parameters<typeof createTask>[0]>): Task {
    return createTask({
      name: "Agent Task",
      agent: "claude",
      prompt: "run tests",
      command: 'claude -p "run tests" --dangerously-skip-permissions',
      workingDir: "/tmp/project",
      scheduleType: "manual",
      ...overrides,
    });
  }

  function createCustomTask(): Task {
    return createTask({
      name: "Custom Task",
      agent: "custom",
      command: "echo hello",
      workingDir: "/tmp/custom",
      scheduleType: "manual",
    });
  }

  // --- Initial render ---

  it("renders with task name on initial step", () => {
    const task = createAgentTask();
    const { lastFrame } = render(<EditWizard task={task} />);
    const frame = lastFrame()!;
    expect(frame).toContain("Edit Task: Agent Task");
    expect(frame).toContain("Task name:");
    expect(frame).toContain("Agent Task");
  });

  // --- Single step transitions ---

  it("shows prompt step for agent tasks after name submit", async () => {
    const task = createAgentTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);

    const frame = await submitAndWaitFor(stdin, lastFrame, "Prompt for");
    expect(frame).toContain("Prompt for claude:");
    expect(frame).toContain("run tests");
  });

  it("shows command step for custom agent after name submit", async () => {
    const task = createCustomTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);

    const frame = await submitAndWaitFor(stdin, lastFrame, "Command:");
    expect(frame).toContain("Command:");
    expect(frame).toContain("echo hello");
  });

  it("does not show prompt step for custom agent", async () => {
    const task = createCustomTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);

    const frame = await submitAndWaitFor(stdin, lastFrame, "Command:");
    expect(frame).not.toContain("Prompt for");
  });

  it("shows preview of rebuilt command on prompt step", async () => {
    const task = createAgentTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);

    const frame = await submitAndWaitFor(stdin, lastFrame, "Prompt for");
    expect(frame).toContain("claude -p");
    expect(frame).toContain("--dangerously-skip-permissions");
  });

  // --- Multi-step transitions ---

  it("shows working directory step after prompt submit", async () => {
    const task = createAgentTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);

    await submitAndWaitFor(stdin, lastFrame, "Prompt for");
    const frame = await submitAndWaitFor(stdin, lastFrame, "Working directory:");
    expect(frame).toContain("/tmp/project");
  });

  it("shows schedule type step after workdir submit", async () => {
    const task = createAgentTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);

    await submitAndWaitFor(stdin, lastFrame, "Prompt for");
    await submitAndWaitFor(stdin, lastFrame, "Working directory:");
    const frame = await submitAndWaitFor(stdin, lastFrame, "Schedule type:");
    expect(frame).toContain("Cron expression");
    expect(frame).toContain("Interval");
    expect(frame).toContain("Manual only");
  });

  it("shows confirm step with agent/prompt info for agent tasks", async () => {
    const task = createAgentTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);

    await submitAndWaitFor(stdin, lastFrame, "Prompt for");
    await submitAndWaitFor(stdin, lastFrame, "Working directory:");
    await submitAndWaitFor(stdin, lastFrame, "Schedule type:");
    // Select "Manual only" (3rd item: arrow down twice, then enter)
    await new Promise((r) => setTimeout(r, 100));
    stdin.write("\x1B[B");
    await new Promise((r) => setTimeout(r, 50));
    stdin.write("\x1B[B");
    await new Promise((r) => setTimeout(r, 50));
    stdin.write("\r");
    const frame = await waitFor(lastFrame, (f) => f.includes("Summary:"));
    expect(frame).toContain("Agent:     claude");
    expect(frame).toContain("Prompt:    run tests");
    expect(frame).toContain("Command:");
  });

  it("confirm step for custom tasks does not show agent/prompt", async () => {
    const task = createCustomTask();
    const { lastFrame, stdin } = render(<EditWizard task={task} />);

    await submitAndWaitFor(stdin, lastFrame, "Command:");
    await submitAndWaitFor(stdin, lastFrame, "Working directory:");
    await submitAndWaitFor(stdin, lastFrame, "Schedule type:");
    await new Promise((r) => setTimeout(r, 100));
    stdin.write("\x1B[B");
    await new Promise((r) => setTimeout(r, 50));
    stdin.write("\x1B[B");
    await new Promise((r) => setTimeout(r, 50));
    stdin.write("\r");
    const frame = await waitFor(lastFrame, (f) => f.includes("Summary:"));
    expect(frame).not.toContain("Agent:");
    expect(frame).not.toContain("Prompt:");
    expect(frame).toContain("echo hello");
  });

  it("pre-fills cron schedule value for cron tasks", async () => {
    const task = createAgentTask({
      scheduleType: "cron",
      scheduleCron: "0 9 * * *",
    });
    const { lastFrame, stdin } = render(<EditWizard task={task} />);

    await submitAndWaitFor(stdin, lastFrame, "Prompt for");
    await submitAndWaitFor(stdin, lastFrame, "Working directory:");
    await submitAndWaitFor(stdin, lastFrame, "Schedule type:");
    // Select cron (first item - just enter)
    await new Promise((r) => setTimeout(r, 100));
    stdin.write("\r");
    const frame = await waitFor(lastFrame, (f) => f.includes("Cron expression"));
    expect(frame).toContain("0 9 * * *");
  });

  it("extracts prompt from command for tasks without stored prompt", async () => {
    const task = createTask({
      name: "Legacy Task",
      agent: "claude",
      command: 'claude -p "legacy prompt" --dangerously-skip-permissions',
      workingDir: "/tmp",
      scheduleType: "manual",
    });

    const { lastFrame, stdin } = render(<EditWizard task={task} />);

    const frame = await submitAndWaitFor(stdin, lastFrame, "Prompt for");
    expect(frame).toContain("Prompt for claude:");
    expect(frame).toContain("legacy prompt");
  });
});
