import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "ink-testing-library";
import { ExecutionList } from "../../../src/commands/logs.js";
import { createTestEnv, type TestEnv } from "../../helpers/setup.js";
import type { Execution } from "../../../src/lib/schema.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

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

    const { lastFrame } = render(
      <ExecutionList executions={executions} taskName="My Task" />,
    );
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

  it("displays absolute datetime alongside relative time", () => {
    const startDate = new Date(2026, 3, 4, 9, 3, 0);
    const executions: Execution[] = [
      {
        id: "exec-1",
        taskId: "task-1",
        startedAt: startDate.toISOString(),
        finishedAt: new Date(startDate.getTime() + 5000).toISOString(),
        exitCode: 0,
        status: "success",
        stdoutPath: "/tmp/stdout.log",
        stderrPath: "/tmp/stderr.log",
      },
    ];

    const { lastFrame } = render(<ExecutionList executions={executions} />);
    const frame = lastFrame()!;
    expect(frame).toContain("2026-04-04 09:03");
  });

  it("displays task name and task ID when showing all tasks", () => {
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
      },
    ];

    const taskMap = { "task-1": "Daily Lint" };
    const { lastFrame } = render(
      <ExecutionList executions={executions} taskMap={taskMap} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("Daily Lint");
    expect(frame).toContain("task-1");
  });

  it("shows log file path for each execution", () => {
    const executions: Execution[] = [
      {
        id: "exec-1",
        taskId: "task-1",
        startedAt: new Date().toISOString(),
        finishedAt: new Date(Date.now() + 5000).toISOString(),
        exitCode: 0,
        status: "success",
        stdoutPath: "/tmp/test-stdout.log",
        stderrPath: "/tmp/test-stderr.log",
      },
    ];

    const { lastFrame } = render(<ExecutionList executions={executions} />);
    const frame = lastFrame()!;
    expect(frame).toContain("/tmp/test-stdout.log");
  });

  it("respects lines option to control stdout preview lines", () => {
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
        stdoutTail: "line1\nline2\nline3\nline4\nline5",
      },
    ];

    // Default: 3 lines
    const { lastFrame: frame3 } = render(
      <ExecutionList executions={executions} />,
    );
    const output3 = frame3()!;
    expect(output3).toContain("line3");
    expect(output3).toContain("line5");
    expect(output3).not.toContain("line2");

    // Custom: 5 lines
    const { lastFrame: frame5 } = render(
      <ExecutionList executions={executions} lines={5} />,
    );
    const output5 = frame5()!;
    expect(output5).toContain("line1");
    expect(output5).toContain("line5");
  });

  it("shows stderr content when stderr flag is set", () => {
    const stderrFile = join(env.tmpDir, "stderr-test.log");
    writeFileSync(stderrFile, "Warning: something went wrong\nError: fatal");

    const executions: Execution[] = [
      {
        id: "exec-1",
        taskId: "task-1",
        startedAt: new Date().toISOString(),
        finishedAt: new Date(Date.now() + 5000).toISOString(),
        exitCode: 1,
        status: "failed",
        stdoutPath: "/tmp/stdout.log",
        stderrPath: stderrFile,
        stdoutTail: "some output",
      },
    ];

    // Without stderr flag: no stderr content
    const { lastFrame: frameWithout } = render(
      <ExecutionList executions={executions} />,
    );
    expect(frameWithout()!).not.toContain("Warning: something went wrong");

    // With stderr flag: show stderr content
    const { lastFrame: frameWith } = render(
      <ExecutionList executions={executions} showStderr={true} />,
    );
    expect(frameWith()!).toContain("Warning: something went wrong");
  });

  it("shows full stdout when full flag is set", () => {
    const stdoutFile = join(env.tmpDir, "stdout-test.log");
    writeFileSync(
      stdoutFile,
      "full line 1\nfull line 2\nfull line 3\nfull line 4\nfull line 5",
    );

    const executions: Execution[] = [
      {
        id: "exec-1",
        taskId: "task-1",
        startedAt: new Date().toISOString(),
        finishedAt: new Date(Date.now() + 5000).toISOString(),
        exitCode: 0,
        status: "success",
        stdoutPath: stdoutFile,
        stderrPath: "/tmp/stderr.log",
        stdoutTail: "full line 4\nfull line 5",
      },
    ];

    const { lastFrame } = render(
      <ExecutionList executions={executions} showFull={true} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain("full line 1");
    expect(frame).toContain("full line 5");
  });
});
