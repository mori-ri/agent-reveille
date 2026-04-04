import React from "react";
import { render, Box, Text } from "ink";
import { listTasks, getTaskExecutions } from "../lib/tasks.js";
import { isLoaded } from "../lib/scheduler.js";
import { formatRelativeTime, formatSchedule, formatStatus } from "../utils/format.js";

export function TaskList() {
  const tasks = listTasks();

  if (tasks.length === 0) {
    return (
      <Box paddingX={1} flexDirection="column">
        <Text color="gray">No tasks configured. Run </Text>
        <Text bold color="cyan">reveille add</Text>
        <Text color="gray"> to create one.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        reveille - Tasks
      </Text>
      <Text> </Text>
      <Box>
        <Box width={10}>
          <Text bold color="gray">ID</Text>
        </Box>
        <Box width={20}>
          <Text bold color="gray">NAME</Text>
        </Box>
        <Box width={10}>
          <Text bold color="gray">AGENT</Text>
        </Box>
        <Box width={30}>
          <Text bold color="gray">SCHEDULE</Text>
        </Box>
        <Box width={12}>
          <Text bold color="gray">STATUS</Text>
        </Box>
        <Box>
          <Text bold color="gray">LAST RUN</Text>
        </Box>
      </Box>
      <Text color="gray">{"─".repeat(100)}</Text>
      {tasks.map((task) => {
        const loaded = isLoaded(task.id);
        const status = task.scheduleType === "manual" ? "manual" : loaded ? "active" : "paused";
        const executions = getTaskExecutions(task.id, 1);
        const lastRun = executions[0];

        const scheduleText = formatSchedule(task);

        return (
          <Box key={task.id}>
            <Box width={10}>
              <Text color="gray">{task.id}</Text>
            </Box>
            <Box width={20}>
              <Text>{task.name}</Text>
            </Box>
            <Box width={10}>
              <Text color="magenta">
                {task.agent}
                {task.model ? <Text color="gray">/{task.model}</Text> : null}
              </Text>
            </Box>
            <Box width={30}>
              <Text>{scheduleText}</Text>
            </Box>
            <Box width={12}>
              <Text>{formatStatus(status)}</Text>
            </Box>
            <Box>
              <Text color="gray">
                {lastRun ? formatRelativeTime(lastRun.startedAt) : "never"}
              </Text>
            </Box>
          </Box>
        );
      })}
      <Text> </Text>
      <Text color="gray">{tasks.length} task(s)</Text>
    </Box>
  );
}

export default async function list(_args: string[]) {
  const { unmount, waitUntilExit } = render(<TaskList />);
  unmount();
  await waitUntilExit();
  if (process.stdin.isTTY && process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
  process.stdin.unref();
}
