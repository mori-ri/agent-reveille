import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { listTasks, getTaskExecutions, getRecentExecutions } from "../lib/tasks.js";
import { isLoaded } from "../lib/scheduler.js";
import { formatDuration, formatRelativeTime, formatStatus } from "../utils/format.js";
import cronstrue from "cronstrue";
import type { Task, Execution } from "../lib/schema.js";

const VERSION = "0.1.0";

function Header() {
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">
          {"  "}cronai
        </Text>
        <Text color="gray"> - AI Agent Task Scheduler</Text>
        <Text color="gray"> v{VERSION}</Text>
      </Box>
      <Text color="gray">{"─".repeat(70)}</Text>
    </Box>
  );
}

function StatusBadge({ task }: { task: Task }) {
  const loaded = isLoaded(task.id);
  const status = task.scheduleType === "manual" ? "manual" : loaded ? "active" : "paused";
  return <Text>{formatStatus(status)}</Text>;
}

function TaskRow({
  task,
  selected,
  lastExec,
}: {
  task: Task;
  selected: boolean;
  lastExec?: Execution;
}) {
  let scheduleText = "manual";
  if (task.scheduleType === "cron" && task.scheduleCron) {
    try {
      scheduleText = cronstrue.toString(task.scheduleCron);
    } catch {
      scheduleText = task.scheduleCron;
    }
  } else if (task.scheduleType === "interval" && task.scheduleIntervalSeconds) {
    scheduleText = `every ${Math.round(task.scheduleIntervalSeconds / 60)}m`;
  }

  return (
    <Box>
      <Text color={selected ? "cyan" : undefined} bold={selected}>
        {selected ? "❯ " : "  "}
      </Text>
      <Box width={10}>
        <Text color="gray" dimColor={!selected}>
          {task.id}
        </Text>
      </Box>
      <Box width={18}>
        <Text bold={selected}>{task.name}</Text>
      </Box>
      <Box width={8}>
        <Text color="magenta">{task.agent}</Text>
      </Box>
      <Box width={22}>
        <Text>{scheduleText}</Text>
      </Box>
      <Box width={12}>
        <StatusBadge task={task} />
      </Box>
      <Box>
        <Text color="gray">{lastExec ? formatRelativeTime(lastExec.startedAt) : "never"}</Text>
      </Box>
    </Box>
  );
}

function DetailPanel({ task, executions }: { task: Task; executions: Execution[] }) {
  const lastExec = executions[0];

  return (
    <Box flexDirection="column" marginTop={1} paddingX={2}>
      <Text color="gray">{"─".repeat(70)}</Text>
      <Text bold>
        {task.name}
        <Text color="gray"> ({task.id})</Text>
      </Text>
      <Text>
        <Text color="gray">Command: </Text>
        <Text>{task.command}</Text>
      </Text>
      <Text>
        <Text color="gray">Dir:     </Text>
        <Text>{task.workingDir}</Text>
      </Text>
      {lastExec && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Last Execution:</Text>
          <Text>
            {"  "}
            {formatStatus(lastExec.status)}
            <Text color="gray"> | </Text>
            Duration:{" "}
            {lastExec.finishedAt
              ? formatDuration(
                  new Date(lastExec.finishedAt).getTime() -
                    new Date(lastExec.startedAt).getTime()
                )
              : "running..."}
            <Text color="gray"> | </Text>
            Exit: {lastExec.exitCode ?? "-"}
          </Text>
          {lastExec.stdoutTail && (
            <Box marginTop={1}>
              <Text color="gray">
                {lastExec.stdoutTail.split("\n").slice(-3).join("\n")}
              </Text>
            </Box>
          )}
        </Box>
      )}
      {!lastExec && (
        <Text color="gray" italic>
          No execution history
        </Text>
      )}
    </Box>
  );
}

function HelpBar() {
  return (
    <Box marginTop={1}>
      <Text color="gray">
        {"  "}
        <Text bold color="white">j/k</Text> navigate{"  "}
        <Text bold color="white">a</Text> add{"  "}
        <Text bold color="white">r</Text> remove{"  "}
        <Text bold color="white">space</Text> toggle{"  "}
        <Text bold color="white">R</Text> run now{"  "}
        <Text bold color="white">l</Text> logs{"  "}
        <Text bold color="white">q</Text> quit
      </Text>
    </Box>
  );
}

function Dashboard() {
  const { exit } = useApp();
  const [tasks, setTasks] = useState<Task[]>(listTasks());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [message, setMessage] = useState("");

  // Refresh tasks periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(listTasks());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedTask = tasks[selectedIndex];
  const executions = selectedTask ? getTaskExecutions(selectedTask.id, 5) : [];

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }

    if (input === "j" || key.downArrow) {
      setSelectedIndex((i) => Math.min(i + 1, tasks.length - 1));
    }
    if (input === "k" || key.upArrow) {
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }

    if (input === "R" && selectedTask) {
      setMessage(`Running ${selectedTask.name}... (use cronai run ${selectedTask.id} in another terminal)`);
    }
  });

  return (
    <Box flexDirection="column">
      <Header />

      {tasks.length === 0 ? (
        <Box paddingX={2} marginTop={1}>
          <Text color="gray">
            No tasks. Press <Text bold color="white">a</Text> to add one, or run{" "}
            <Text bold color="cyan">cronai add</Text>.
          </Text>
        </Box>
      ) : (
        <>
          <Box flexDirection="column" marginTop={1} paddingX={1}>
            <Box>
              <Text>{"  "}</Text>
              <Box width={10}>
                <Text bold color="gray">ID</Text>
              </Box>
              <Box width={18}>
                <Text bold color="gray">NAME</Text>
              </Box>
              <Box width={8}>
                <Text bold color="gray">AGENT</Text>
              </Box>
              <Box width={22}>
                <Text bold color="gray">SCHEDULE</Text>
              </Box>
              <Box width={12}>
                <Text bold color="gray">STATUS</Text>
              </Box>
              <Box>
                <Text bold color="gray">LAST RUN</Text>
              </Box>
            </Box>
            {tasks.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                selected={i === selectedIndex}
                lastExec={getTaskExecutions(task.id, 1)[0]}
              />
            ))}
          </Box>

          {selectedTask && (
            <DetailPanel task={selectedTask} executions={executions} />
          )}
        </>
      )}

      {message && (
        <Box paddingX={2} marginTop={1}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}

      <HelpBar />
    </Box>
  );
}

export default async function dashboard(_args: string[]) {
  render(<Dashboard />);
}
