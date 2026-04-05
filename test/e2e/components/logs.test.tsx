import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ExecutionList } from "../../../src/commands/logs.js";
import type { Execution } from "../../../src/lib/schema.js";
import { type TestEnv, createTestEnv } from "../../helpers/setup.js";

describe("ExecutionList component", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  it("displays empty state when no executions", () => {
    const { lastFrame } = render(<ExecutionList executions={[]} />);
    expect(lastFrame()).toContain("No execution history");
  });

  it("displays execution details", () => {
    const executions: Execution[] = [
      {
        id: "exec-1",
        taskId: "task-1",
        startedAt: new Date().toISOString(),
        finishedAt: new Date(Date.now() + 5000).toISOString(),
        exitCode: 0,
        status: "success",
        stdoutPath: "/tmp/stdout.log",
        stderrPath: "/tmp/stderr.log",
        stdoutTail: "hello world",
      },
    ];

    const { lastFrame } = render(<ExecutionList executions={executions} />);
    const frame = lastFrame()!;
    expect(frame).toContain("Execution Logs");
    expect(frame).toContain("Exit: 0");
    expect(frame).toContain("hello world");
  });

  it("displays task name in title when provided", () => {
    const executions: Execution[] = [
      {
        id: "exec-1",
        taskId: "task-1",
        startedAt: new Date().toISOString(),
        finishedAt: new Date(Date.now() + 1000).toISOString(),
        exitCode: 0,
        status: "success",
        stdoutPath: "/tmp/stdout.log",
        stderrPath: "/tmp/stderr.log",
      },
    ];

    const { lastFrame } = render(<ExecutionList executions={executions} taskName="My Task" />);
    expect(lastFrame()).toContain("My Task");
  });

  it("displays failed execution status", () => {
    const executions: Execution[] = [
      {
        id: "exec-1",
        taskId: "task-1",
        startedAt: new Date().toISOString(),
        finishedAt: new Date(Date.now() + 2000).toISOString(),
        exitCode: 1,
        status: "failed",
        stdoutPath: "/tmp/stdout.log",
        stderrPath: "/tmp/stderr.log",
      },
    ];

    const { lastFrame } = render(<ExecutionList executions={executions} />);
    const frame = lastFrame()!;
    expect(frame).toContain("Exit: 1");
  });
});
