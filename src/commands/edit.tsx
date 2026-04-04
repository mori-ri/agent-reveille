import React, { useState } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { getTask, updateTask } from "../lib/tasks.js";
import { installPlist, uninstallPlist } from "../lib/scheduler.js";
import { buildCommand, extractPrompt } from "../lib/agents.js";
import type { Task, ScheduleType } from "../lib/schema.js";
import cronstrue from "cronstrue";

type Step = "name" | "prompt" | "command" | "workdir" | "schedule-type" | "schedule-value" | "confirm";

interface EditDraft {
  name: string;
  prompt: string;
  command: string;
  workingDir: string;
  scheduleType: ScheduleType;
  scheduleValue: string;
}

function validateCron(cron: string): boolean {
  const fields = cron.trim().split(/\s+/);
  return fields.length === 5;
}

function validateInterval(value: string): boolean {
  const n = parseInt(value, 10);
  return !isNaN(n) && n > 0;
}

function resolvePrompt(task: Task): string {
  if (task.prompt) return task.prompt;
  if (task.agent !== "custom") {
    const extracted = extractPrompt(task.agent, task.command);
    if (extracted) return extracted;
  }
  return "";
}

export function EditWizard({ task }: { task: Task }) {
  const { exit } = useApp();
  const isCustomAgent = task.agent === "custom";
  const initialPrompt = resolvePrompt(task);

  const [step, setStep] = useState<Step>("name");
  const [draft, setDraft] = useState<EditDraft>({
    name: task.name,
    prompt: initialPrompt,
    command: task.command,
    workingDir: task.workingDir,
    scheduleType: task.scheduleType,
    scheduleValue:
      task.scheduleType === "cron"
        ? task.scheduleCron ?? ""
        : task.scheduleType === "interval"
          ? String(task.scheduleIntervalSeconds ?? "")
          : "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const scheduleItems = [
    { label: "Cron expression (e.g., daily at 9am)", value: "cron" as ScheduleType },
    { label: "Interval (seconds)", value: "interval" as ScheduleType },
    { label: "Manual only (run manually)", value: "manual" as ScheduleType },
  ];

  // After name, go to prompt (for agent tasks) or command (for custom)
  function afterName() {
    if (isCustomAgent) {
      setStep("command");
    } else {
      setStep("prompt");
    }
  }

  function handleConfirm() {
    try {
      const updates: Partial<Task> = {};
      if (draft.name !== task.name) updates.name = draft.name;
      if (draft.workingDir !== task.workingDir) updates.workingDir = draft.workingDir;

      // Handle prompt/command changes
      if (isCustomAgent) {
        if (draft.command !== task.command) updates.command = draft.command;
      } else {
        const oldPrompt = initialPrompt;
        if (draft.prompt !== oldPrompt) {
          updates.prompt = draft.prompt;
          updates.command = buildCommand(task.agent, draft.prompt);
        }
      }

      const scheduleChanged = draft.scheduleType !== task.scheduleType ||
        (draft.scheduleType === "cron" && draft.scheduleValue !== task.scheduleCron) ||
        (draft.scheduleType === "interval" && parseInt(draft.scheduleValue, 10) !== task.scheduleIntervalSeconds);

      if (scheduleChanged) {
        updates.scheduleType = draft.scheduleType;
        updates.scheduleCron = draft.scheduleType === "cron" ? draft.scheduleValue : undefined;
        updates.scheduleIntervalSeconds =
          draft.scheduleType === "interval" ? parseInt(draft.scheduleValue, 10) : undefined;
        updates.enabled = draft.scheduleType !== "manual";
      }

      const updated = updateTask(task.id, updates);

      if (scheduleChanged) {
        if (draft.scheduleType === "manual") {
          uninstallPlist(task.id);
        } else {
          installPlist(updated);
        }
      }

      setDone(true);
      setTimeout(() => exit(), 100);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (done) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="green" bold>
          Task updated: {draft.name} ({task.id})
        </Text>
      </Box>
    );
  }

  const displayCommand = isCustomAgent
    ? draft.command
    : draft.prompt
      ? buildCommand(task.agent, draft.prompt)
      : task.command;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        reveille - Edit Task: {task.name}
      </Text>
      <Text> </Text>

      {error && <Text color="red">{error}</Text>}

      {step === "name" && (
        <Box flexDirection="column">
          <Text>Task name:</Text>
          <TextInput
            value={draft.name}
            onChange={(v) => setDraft({ ...draft, name: v })}
            onSubmit={(v) => {
              if (v.trim()) afterName();
            }}
          />
        </Box>
      )}

      {step === "prompt" && (
        <Box flexDirection="column">
          <Text>Prompt for {task.agent}:</Text>
          <TextInput
            value={draft.prompt}
            onChange={(v) => setDraft({ ...draft, prompt: v })}
            onSubmit={(v) => {
              if (v.trim()) setStep("workdir");
            }}
          />
          {draft.prompt && (
            <Text color="gray">
              → {buildCommand(task.agent, draft.prompt)}
            </Text>
          )}
        </Box>
      )}

      {step === "command" && (
        <Box flexDirection="column">
          <Text>Command:</Text>
          <TextInput
            value={draft.command}
            onChange={(v) => setDraft({ ...draft, command: v })}
            onSubmit={(v) => {
              if (v.trim()) setStep("workdir");
            }}
          />
        </Box>
      )}

      {step === "workdir" && (
        <Box flexDirection="column">
          <Text>Working directory:</Text>
          <TextInput
            value={draft.workingDir}
            onChange={(v) => setDraft({ ...draft, workingDir: v })}
            onSubmit={(v) => {
              if (v.trim()) setStep("schedule-type");
            }}
          />
        </Box>
      )}

      {step === "schedule-type" && (
        <Box flexDirection="column">
          <Text>Schedule type:</Text>
          <SelectInput
            items={scheduleItems}
            onSelect={(item) => {
              setDraft({ ...draft, scheduleType: item.value });
              if (item.value === "manual") {
                setStep("confirm");
              } else {
                setStep("schedule-value");
              }
            }}
          />
        </Box>
      )}

      {step === "schedule-value" && (
        <Box flexDirection="column">
          <Text>
            {draft.scheduleType === "cron"
              ? "Cron expression (minute hour day month weekday):"
              : "Interval in seconds:"}
          </Text>
          <TextInput
            value={draft.scheduleValue}
            onChange={(v) => setDraft({ ...draft, scheduleValue: v })}
            onSubmit={(v) => {
              if (v.trim()) setStep("confirm");
            }}
          />
          {draft.scheduleType === "cron" && draft.scheduleValue && (
            <Text color="gray">
              {(() => {
                try {
                  return cronstrue.toString(draft.scheduleValue);
                } catch {
                  return "(invalid cron)";
                }
              })()}
            </Text>
          )}
        </Box>
      )}

      {step === "confirm" && (
        <Box flexDirection="column">
          <Text bold>Summary:</Text>
          <Text>  Name:      {draft.name}</Text>
          {!isCustomAgent && <Text>  Agent:     {task.agent}</Text>}
          {!isCustomAgent && <Text>  Prompt:    {draft.prompt}</Text>}
          <Text>  Command:   {displayCommand}</Text>
          <Text>  Directory: {draft.workingDir}</Text>
          <Text>
            {"  Schedule:  "}
            {draft.scheduleType === "manual"
              ? "Manual"
              : draft.scheduleType === "cron"
                ? cronstrue.toString(draft.scheduleValue)
                : `Every ${draft.scheduleValue} seconds`}
          </Text>
          <Text> </Text>
          <Text color="cyan">Press Enter to save, or Ctrl+C to cancel.</Text>
          <ConfirmInput onConfirm={handleConfirm} />
        </Box>
      )}
    </Box>
  );
}

function ConfirmInput({ onConfirm }: { onConfirm: () => void }) {
  useInput((input, key) => {
    if (key.return) onConfirm();
  });
  return null;
}

function printTaskSummary(task: Task): void {
  console.log(`  Name:      ${task.name}`);
  if (task.prompt) {
    console.log(`  Prompt:    ${task.prompt}`);
  }
  console.log(`  Command:   ${task.command}`);
  console.log(`  Directory: ${task.workingDir}`);
  if (task.scheduleType === "cron" && task.scheduleCron) {
    console.log(`  Schedule:  cron ${task.scheduleCron}`);
  } else if (task.scheduleType === "interval" && task.scheduleIntervalSeconds) {
    console.log(`  Schedule:  every ${task.scheduleIntervalSeconds}s`);
  } else {
    console.log(`  Schedule:  manual`);
  }
}

export default async function edit(args: string[]) {
  const id = args[0];
  if (!id) {
    console.error("Usage: reveille edit <task-id> [--name NAME] [--prompt TEXT] [--cmd CMD] [--cron EXPR] [--interval SECS] [--dir PATH]");
    process.exit(1);
  }

  const task = getTask(id);
  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }

  // Parse flags for non-interactive mode
  const flagArgs = args.slice(1);
  const nameIdx = flagArgs.indexOf("--name");
  const promptIdx = flagArgs.indexOf("--prompt");
  const cmdIdx = flagArgs.indexOf("--cmd");
  const cronIdx = flagArgs.indexOf("--cron");
  const intervalIdx = flagArgs.indexOf("--interval");
  const dirIdx = flagArgs.indexOf("--dir");

  const hasFlags = nameIdx !== -1 || promptIdx !== -1 || cmdIdx !== -1 || cronIdx !== -1 || intervalIdx !== -1 || dirIdx !== -1;

  if (hasFlags) {
    // Non-interactive mode
    const updates: Partial<Task> = {};
    let scheduleChanged = false;

    if (nameIdx !== -1) {
      updates.name = flagArgs[nameIdx + 1];
    }
    if (promptIdx !== -1) {
      const newPrompt = flagArgs[promptIdx + 1];
      updates.prompt = newPrompt;
      if (task.agent !== "custom") {
        updates.command = buildCommand(task.agent, newPrompt);
      }
    }
    if (cmdIdx !== -1) {
      updates.command = flagArgs[cmdIdx + 1];
    }
    if (dirIdx !== -1) {
      updates.workingDir = flagArgs[dirIdx + 1];
    }
    if (cronIdx !== -1) {
      const cronExpr = flagArgs[cronIdx + 1];
      if (!validateCron(cronExpr)) {
        console.error(`Invalid cron expression: ${cronExpr}`);
        process.exit(1);
      }
      updates.scheduleType = "cron";
      updates.scheduleCron = cronExpr;
      updates.scheduleIntervalSeconds = undefined;
      updates.enabled = true;
      scheduleChanged = true;
    }
    if (intervalIdx !== -1) {
      const intervalStr = flagArgs[intervalIdx + 1];
      if (!validateInterval(intervalStr)) {
        console.error(`Invalid interval value: ${intervalStr}`);
        process.exit(1);
      }
      updates.scheduleType = "interval";
      updates.scheduleIntervalSeconds = parseInt(intervalStr, 10);
      updates.scheduleCron = undefined;
      updates.enabled = true;
      scheduleChanged = true;
    }

    const updated = updateTask(id, updates);

    if (scheduleChanged) {
      installPlist(updated);
    }

    // Print confirmation
    console.log(`Task updated: ${updated.name} (${updated.id})`);
    printTaskSummary(updated);
    return;
  }

  // No flags — launch interactive wizard
  if (!process.stdin.isTTY) {
    // Fallback for non-TTY: show current state
    console.log(`No changes specified. Current task:`);
    printTaskSummary(task);
    console.log("");
    console.log("Use flags to update: --name, --prompt, --cmd, --cron, --interval, --dir");
    return;
  }

  const { waitUntilExit } = render(<EditWizard task={task} />);
  await waitUntilExit();
}
