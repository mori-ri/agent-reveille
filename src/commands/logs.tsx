import React from "react";
import { render, Box, Text } from "ink";
import { getTaskExecutions, getRecentExecutions, getTask, listTasks } from "../lib/tasks.js";
import { formatDuration, formatRelativeTime, formatAbsoluteTime, formatStatus } from "../utils/format.js";
import { readLogFile } from "../lib/executor.js";
import type { Execution } from "../lib/schema.js";

interface ExecutionListProps {
  executions: Execution[];
  taskName?: string;
  taskMap?: Record<string, string>;
  lines?: number;
  showStderr?: boolean;
  showFull?: boolean;
}

export function ExecutionList({
  executions,
  taskName,
  taskMap,
  lines = 3,
  showStderr = false,
  showFull = false,
}: ExecutionListProps) {
  if (executions.length === 0) {
    return (
      <Box paddingX={1}>
        <Text color="gray">No execution history.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        reveille - Execution Logs{taskName ? ` (${taskName})` : ""}
      </Text>
      <Text> </Text>
      {executions.map((exec) => {
        const duration =
          exec.finishedAt
            ? formatDuration(
                new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()
              )
            : "running...";

        const absoluteTime = formatAbsoluteTime(exec.startedAt);
        const relativeTime = formatRelativeTime(exec.startedAt);

        // Determine stdout content to show
        let stdoutContent: string | undefined;
        if (showFull && exec.stdoutPath) {
          const fullLog = readLogFile(exec.stdoutPath);
          if (fullLog !== "(log file not found)") {
            stdoutContent = fullLog.trimEnd();
          }
        } else if (exec.stdoutTail) {
          stdoutContent = exec.stdoutTail
            .split("\n")
            .slice(-lines)
            .join("\n");
        }

        // Determine stderr content
        let stderrContent: string | undefined;
        if (showStderr && exec.stderrPath) {
          const stderrLog = readLogFile(exec.stderrPath);
          if (stderrLog !== "(log file not found)") {
            const trimmed = stderrLog.trim();
            if (trimmed.length > 0) {
              stderrContent = trimmed;
            }
          }
        }

        // Task info when showing all tasks
        const taskLabel = taskMap && taskMap[exec.taskId]
          ? `${taskMap[exec.taskId]} (${exec.taskId})`
          : undefined;

        return (
          <Box key={exec.id} flexDirection="column" marginBottom={1}>
            {taskLabel && (
              <Text bold color="white">
                {taskLabel}
              </Text>
            )}
            <Box>
              <Text>{formatStatus(exec.status)}</Text>
              <Text color="gray"> | </Text>
              <Text>{absoluteTime}</Text>
              <Text color="gray"> ({relativeTime})</Text>
              <Text color="gray"> | </Text>
              <Text>Duration: {duration}</Text>
              <Text color="gray"> | </Text>
              <Text>Exit: {exec.exitCode ?? "-"}</Text>
            </Box>
            {exec.stdoutPath && (
              <Box marginLeft={2}>
                <Text color="gray">Log: {exec.stdoutPath}</Text>
              </Box>
            )}
            {stdoutContent && (
              <Box marginLeft={2} flexDirection="column">
                <Text color="gray">{stdoutContent}</Text>
              </Box>
            )}
            {stderrContent && (
              <Box marginLeft={2} flexDirection="column">
                <Text color="red">{stderrContent}</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function parseArgs(args: string[]): {
  id?: string;
  lines: number;
  showStderr: boolean;
  showFull: boolean;
} {
  let id: string | undefined;
  let lines = 3;
  let showStderr = false;
  let showFull = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--lines" || arg === "-n") {
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        lines = parseInt(next, 10);
        i++;
      }
    } else if (arg === "--stderr") {
      showStderr = true;
    } else if (arg === "--full") {
      showFull = true;
    } else if (!arg.startsWith("-")) {
      id = arg;
    }
  }

  return { id, lines, showStderr, showFull };
}

export default async function logs(args: string[]) {
  const { id, lines, showStderr, showFull } = parseArgs(args);

  let instance;
  if (id) {
    const task = getTask(id);
    if (!task) {
      console.error(`Task not found: ${id}`);
      process.exit(1);
    }
    const executions = getTaskExecutions(id);
    instance = render(
      <ExecutionList
        executions={executions}
        taskName={task.name}
        lines={lines}
        showStderr={showStderr}
        showFull={showFull}
      />,
    );
  } else {
    const executions = getRecentExecutions();
    const tasks = listTasks();
    const taskMap: Record<string, string> = {};
    for (const t of tasks) {
      taskMap[t.id] = t.name;
    }
    instance = render(
      <ExecutionList
        executions={executions}
        taskMap={taskMap}
        lines={lines}
        showStderr={showStderr}
        showFull={showFull}
      />,
    );
  }

  instance.unmount();
  await instance.waitUntilExit();
  if (process.stdin.isTTY && process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
  process.stdin.unref();
}
