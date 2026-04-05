import cronstrue from "cronstrue";
import { Box, Text, render, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import React, { useState } from "react";
import { buildCommand, getAvailableModels } from "../lib/agents.js";
import { installPlist, uninstallPlist } from "../lib/scheduler.js";
import type { ScheduleType, Task } from "../lib/schema.js";
import { getTask, listTasks, updateTask } from "../lib/tasks.js";
import {
  type Step,
  type StepContext,
  getNextStep,
  getPreviousStep,
} from "../lib/wizard-navigation.js";

interface EditDraft {
  name: string;
  command: string;
  workingDir: string;
  model: string;
  afterTask: string;
  scheduleType: ScheduleType;
  scheduleValue: string;
}

function validateCron(cron: string): boolean {
  const fields = cron.trim().split(/\s+/);
  return fields.length === 5;
}

function validateInterval(value: string): boolean {
  const n = Number.parseInt(value, 10);
  return !Number.isNaN(n) && n > 0;
}

export interface EditWizardProps {
  task: Task;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function EditWizard({ task, onComplete, onCancel }: EditWizardProps) {
  const { exit } = useApp();
  const isCustomAgent = task.agent === "custom";
  const existingTasks = listTasks().filter((t) => t.id !== task.id);

  const [step, setStep] = useState<Step>("name");
  const [draft, setDraft] = useState<EditDraft>({
    name: task.name,
    command: task.command,
    workingDir: task.workingDir,
    model: task.model ?? "",
    afterTask: task.afterTask ?? "",
    scheduleType: task.scheduleType,
    scheduleValue:
      task.scheduleType === "cron"
        ? (task.scheduleCron ?? "")
        : task.scheduleType === "interval"
          ? String(task.scheduleIntervalSeconds ?? "")
          : "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const stepContext: StepContext = {
    agent: task.agent,
    scheduleType: draft.scheduleType,
    hasExistingTasks: existingTasks.length > 0,
    skipAgent: true,
  };

  const scheduleItems = [
    { label: "Cron expression (e.g., daily at 9am)", value: "cron" as ScheduleType },
    { label: "Interval (seconds)", value: "interval" as ScheduleType },
    { label: "Manual only (run manually)", value: "manual" as ScheduleType },
  ];

  useInput((_input, key) => {
    if (key.escape && !done) {
      const prev = getPreviousStep(step, stepContext);
      if (prev) {
        setStep(prev);
      } else if (onCancel) {
        onCancel();
      } else {
        exit();
      }
    }
  });

  function advance() {
    setStep(getNextStep(step, stepContext));
  }

  function handleConfirm() {
    try {
      const updates: Partial<Task> = {};
      if (draft.name !== task.name) updates.name = draft.name;
      if (draft.command !== task.command) updates.command = draft.command;
      if (draft.workingDir !== task.workingDir) updates.workingDir = draft.workingDir;
      if ((draft.model || undefined) !== (task.model || undefined)) {
        updates.model = draft.model || undefined;
      }
      if ((draft.afterTask || undefined) !== (task.afterTask || undefined)) {
        updates.afterTask = draft.afterTask || undefined;
      }

      const scheduleChanged =
        draft.scheduleType !== task.scheduleType ||
        (draft.scheduleType === "cron" && draft.scheduleValue !== task.scheduleCron) ||
        (draft.scheduleType === "interval" &&
          Number.parseInt(draft.scheduleValue, 10) !== task.scheduleIntervalSeconds);

      if (scheduleChanged) {
        updates.scheduleType = draft.scheduleType;
        updates.scheduleCron = draft.scheduleType === "cron" ? draft.scheduleValue : undefined;
        updates.scheduleIntervalSeconds =
          draft.scheduleType === "interval" ? Number.parseInt(draft.scheduleValue, 10) : undefined;
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
      if (onComplete) {
        setTimeout(() => onComplete(), 100);
      } else {
        setTimeout(() => exit(), 100);
      }
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
    : buildCommand(task.agent, draft.command, undefined, draft.model || undefined);

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
              if (v.trim()) advance();
            }}
          />
        </Box>
      )}

      {step === "model" && (
        <Box flexDirection="column">
          <Text>Model (leave empty for agent default):</Text>
          {getAvailableModels(task.agent).length > 0 && (
            <Text color="gray">Suggestions: {getAvailableModels(task.agent).join(", ")}</Text>
          )}
          <TextInput
            value={draft.model}
            onChange={(v) => setDraft({ ...draft, model: v })}
            onSubmit={() => advance()}
          />
        </Box>
      )}

      {step === "prompt" && (
        <Box flexDirection="column">
          <Text>{isCustomAgent ? "Command:" : `Prompt for ${task.agent}:`}</Text>
          <TextInput
            value={draft.command}
            onChange={(v) => setDraft({ ...draft, command: v })}
            onSubmit={(v) => {
              if (v.trim()) advance();
            }}
          />
          {!isCustomAgent && draft.command && (
            <Text color="gray">
              {"→ "}
              {buildCommand(task.agent, draft.command, undefined, draft.model || undefined)}
            </Text>
          )}
        </Box>
      )}

      {step === "workdir" && (
        <Box flexDirection="column">
          <Text>Working directory:</Text>
          <TextInput
            value={draft.workingDir}
            onChange={(v) => setDraft({ ...draft, workingDir: v })}
            onSubmit={(v) => {
              if (v.trim()) advance();
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
              const newDraft = { ...draft, scheduleType: item.value };
              setDraft(newDraft);
              setStep(
                getNextStep("schedule-type", {
                  ...stepContext,
                  scheduleType: item.value,
                }),
              );
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
              if (v.trim()) advance();
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

      {step === "after-task" && (
        <Box flexDirection="column">
          <Text>Run after another task? (leave empty to skip):</Text>
          {existingTasks.map((t) => (
            <Text key={t.id} color="gray">
              {"  "}
              {t.id} — {t.name}
            </Text>
          ))}
          <TextInput
            value={draft.afterTask}
            onChange={(v) => setDraft({ ...draft, afterTask: v })}
            onSubmit={() => advance()}
          />
        </Box>
      )}

      {step === "confirm" && (
        <Box flexDirection="column">
          <Text bold>Summary:</Text>
          <Text>
            {"  Name:      "}
            {draft.name}
          </Text>
          {!isCustomAgent && (
            <Text>
              {"  Agent:     "}
              {task.agent}
            </Text>
          )}
          {!isCustomAgent && draft.model && (
            <Text>
              {"  Model:     "}
              {draft.model}
            </Text>
          )}
          {!isCustomAgent && (
            <Text>
              {"  Prompt:    "}
              {draft.command}
            </Text>
          )}
          <Text>
            {"  Command:   "}
            {displayCommand}
          </Text>
          <Text>
            {"  Directory: "}
            {draft.workingDir}
          </Text>
          <Text>
            {"  Schedule:  "}
            {draft.scheduleType === "manual"
              ? "Manual"
              : draft.scheduleType === "cron"
                ? (() => {
                    try {
                      return cronstrue.toString(draft.scheduleValue);
                    } catch {
                      return draft.scheduleValue;
                    }
                  })()
                : `Every ${draft.scheduleValue} seconds`}
          </Text>
          {draft.afterTask && (
            <Text>
              {"  After:     "}
              {draft.afterTask}
            </Text>
          )}
          <Text> </Text>
          <Text color="cyan">Press Enter to save, or Esc to go back.</Text>
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
  if (task.agent !== "custom") {
    console.log(`  Agent:     ${task.agent}`);
    if (task.model) console.log(`  Model:     ${task.model}`);
    console.log(`  Prompt:    ${task.command}`);
    console.log(`  Command:   ${buildCommand(task.agent, task.command, undefined, task.model)}`);
  } else {
    console.log(`  Command:   ${task.command}`);
  }
  console.log(`  Directory: ${task.workingDir}`);
  if (task.scheduleType === "cron" && task.scheduleCron) {
    console.log(`  Schedule:  cron ${task.scheduleCron}`);
  } else if (task.scheduleType === "interval" && task.scheduleIntervalSeconds) {
    console.log(`  Schedule:  every ${task.scheduleIntervalSeconds}s`);
  } else {
    console.log("  Schedule:  manual");
  }
  if (task.afterTask) {
    console.log(`  After:     ${task.afterTask}`);
  }
}

export default async function edit(args: string[]) {
  const id = args[0];
  if (!id) {
    console.error(
      "Usage: reveille edit <task-id> [--name NAME] [--prompt TEXT] [--cmd CMD] [--model MODEL] [--cron EXPR] [--interval SECS] [--dir PATH] [--after ID]",
    );
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
  const modelIdx = flagArgs.indexOf("--model");
  const cronIdx = flagArgs.indexOf("--cron");
  const intervalIdx = flagArgs.indexOf("--interval");
  const dirIdx = flagArgs.indexOf("--dir");
  const afterIdx = flagArgs.indexOf("--after");

  const hasFlags =
    nameIdx !== -1 ||
    promptIdx !== -1 ||
    cmdIdx !== -1 ||
    modelIdx !== -1 ||
    cronIdx !== -1 ||
    intervalIdx !== -1 ||
    dirIdx !== -1 ||
    afterIdx !== -1;

  if (hasFlags) {
    // Non-interactive mode
    const updates: Partial<Task> = {};
    let scheduleChanged = false;

    if (nameIdx !== -1) {
      updates.name = flagArgs[nameIdx + 1];
    }
    if (promptIdx !== -1) {
      updates.command = flagArgs[promptIdx + 1];
    }
    if (cmdIdx !== -1) {
      // --cmd overrides --prompt if both provided
      updates.command = flagArgs[cmdIdx + 1];
    }
    if (modelIdx !== -1) {
      updates.model = flagArgs[modelIdx + 1] || undefined;
    }
    if (dirIdx !== -1) {
      updates.workingDir = flagArgs[dirIdx + 1];
    }
    if (afterIdx !== -1) {
      updates.afterTask = flagArgs[afterIdx + 1] || undefined;
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
      updates.scheduleIntervalSeconds = Number.parseInt(intervalStr, 10);
      updates.scheduleCron = undefined;
      updates.enabled = true;
      scheduleChanged = true;
    }

    const updated = updateTask(id, updates);

    if (scheduleChanged) {
      installPlist(updated);
    }

    console.log(`Task updated: ${updated.name} (${updated.id})`);
    printTaskSummary(updated);
    return;
  }

  // No flags — launch interactive wizard
  if (!process.stdin.isTTY) {
    console.log("No changes specified. Current task:");
    printTaskSummary(task);
    console.log("");
    console.log(
      "Use flags to update: --name, --prompt, --cmd, --model, --cron, --interval, --dir, --after",
    );
    return;
  }

  const { waitUntilExit } = render(<EditWizard task={task} />);
  await waitUntilExit();
}
