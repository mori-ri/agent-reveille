import React from "react";
import { render, Box, Text } from "ink";
import { getTaskExecutions, getRecentExecutions, getTask } from "../lib/tasks.js";
import { formatDuration, formatRelativeTime, formatStatus } from "../utils/format.js";
import type { Execution } from "../lib/schema.js";

function ExecutionList({ executions, taskName }: { executions: Execution[]; taskName?: string }) {
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

        return (
          <Box key={exec.id} flexDirection="column" marginBottom={1}>
            <Box>
              <Text>{formatStatus(exec.status)}</Text>
              <Text color="gray"> | </Text>
              <Text>{formatRelativeTime(exec.startedAt)}</Text>
              <Text color="gray"> | </Text>
              <Text>Duration: {duration}</Text>
              <Text color="gray"> | </Text>
              <Text>Exit: {exec.exitCode ?? "-"}</Text>
            </Box>
            {exec.stdoutTail && (
              <Box marginLeft={2}>
                <Text color="gray">
                  {exec.stdoutTail.split("\n").slice(-3).join("\n")}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export default async function logs(args: string[]) {
  const id = args[0];

  let instance;
  if (id) {
    const task = getTask(id);
    if (!task) {
      console.error(`Task not found: ${id}`);
      process.exit(1);
    }
    const executions = getTaskExecutions(id);
    instance = render(<ExecutionList executions={executions} taskName={task.name} />);
  } else {
    const executions = getRecentExecutions();
    instance = render(<ExecutionList executions={executions} />);
  }

  instance.unmount();
  await instance.waitUntilExit();
}
