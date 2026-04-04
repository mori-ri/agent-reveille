import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { listTasks, getTaskExecutions, deleteTask, updateTask } from "../lib/tasks.js";
import { getScheduler } from "../lib/platform.js";
import { formatDuration, formatRelativeTime, formatSchedule, formatStatus } from "../utils/format.js";
import { readLogFile } from "../lib/executor.js";
import { Banner } from "../components/Banner.js";
import type { Task, Execution } from "../lib/schema.js";

const VERSION = "0.1.0";

let exitAction: "quit" | "add" = "quit";

function Header() {
  return (
    <Box flexDirection="column">
      <Banner version={VERSION} />
      <Text color="gray">{"─".repeat(70)}</Text>
    </Box>
  );
}

function StatusBadge({ task }: { task: Task }) {
  const loaded = getScheduler().isActive(task.id);
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
  const scheduleText = formatSchedule(task);

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
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refreshTasks = () => {
    const updated = listTasks();
    setTasks(updated);
    if (selectedIndex >= updated.length) {
      setSelectedIndex(Math.max(0, updated.length - 1));
    }
  };

  // Refresh tasks periodically
  useEffect(() => {
    const interval = setInterval(refreshTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedTask = tasks[selectedIndex];
  const executions = selectedTask ? getTaskExecutions(selectedTask.id, 5) : [];

  useInput((input, key) => {
    // Clear message on any input
    if (message && !confirmDelete) setMessage("");

    if (input === "q" || (key.ctrl && input === "c")) {
      exitAction = "quit";
      exit();
      return;
    }

    // Confirm delete flow
    if (confirmDelete) {
      if (input === "y" && selectedTask) {
        getScheduler().uninstall(selectedTask.id);
        deleteTask(selectedTask.id);
        setMessage(`Removed: ${selectedTask.name}`);
        setConfirmDelete(false);
        refreshTasks();
      } else {
        setMessage("Cancelled.");
        setConfirmDelete(false);
      }
      return;
    }

    if (input === "j" || key.downArrow) {
      setSelectedIndex((i) => Math.min(i + 1, tasks.length - 1));
    }
    if (input === "k" || key.upArrow) {
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }

    if (input === "a") {
      exitAction = "add";
      exit();
    }

    if (input === "r" && selectedTask) {
      setConfirmDelete(true);
      setMessage(`Remove "${selectedTask.name}"? (y/n)`);
    }

    if (input === " " && selectedTask) {
      const scheduler = getScheduler();
      const loaded = scheduler.isActive(selectedTask.id);
      if (loaded) {
        scheduler.uninstall(selectedTask.id);
        updateTask(selectedTask.id, { enabled: false });
        setMessage(`Disabled: ${selectedTask.name}`);
      } else {
        scheduler.install(selectedTask);
        updateTask(selectedTask.id, { enabled: true });
        setMessage(`Enabled: ${selectedTask.name}`);
      }
      refreshTasks();
    }

    if (input === "R" && selectedTask) {
      setMessage(`Run in another terminal: reveille run ${selectedTask.id}`);
    }

    if (input === "l" && selectedTask) {
      const lastExec = executions[0];
      if (lastExec?.stdoutPath) {
        const log = readLogFile(lastExec.stdoutPath);
        const lines = log.split("\n").slice(-10).join("\n");
        setMessage(`--- Log (last 10 lines) ---\n${lines}`);
      } else {
        setMessage("No logs available.");
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Header />

      {tasks.length === 0 ? (
        <Box paddingX={2} marginTop={1}>
          <Text color="gray">
            No tasks. Press <Text bold color="white">a</Text> to add one, or run{" "}
            <Text bold color="cyan">reveille add</Text>.
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

function restoreTerminal() {
  if (process.stdin.isTTY && process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
  process.stdin.unref();
}

export default async function dashboard(_args: string[]) {
  if (!process.stdin.isTTY) {
    console.error("Interactive dashboard requires a TTY. Falling back to list view.");
    const listCmd = await import("./list.js");
    await listCmd.default([]);
    return;
  }

  exitAction = "quit";

  const { waitUntilExit } = render(<Dashboard />);
  await waitUntilExit();

  restoreTerminal();

  if (exitAction === "add") {
    await new Promise((r) => setTimeout(r, 50));
    const addCmd = await import("./add.js");
    await addCmd.default([]);
  }
}
