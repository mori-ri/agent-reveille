import cronstrue from "cronstrue";
import { Box, Text, render, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import React, { useState } from "react";
import { detectInstalledAgents, getAvailableModels } from "../lib/agents.js";
import { installPlist } from "../lib/scheduler.js";
import type { AgentId, ScheduleType } from "../lib/schema.js";
import { createTask, listTasks } from "../lib/tasks.js";
import {
  type Step,
  type StepContext,
  getNextStep,
  getPreviousStep,
} from "../lib/wizard-navigation.js";

export function isValidInterval(value: string): boolean {
  if (!value.trim()) return false;
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

interface TaskDraft {
  name: string;
  agent: AgentId;
  model: string;
  prompt: string;
  workingDir: string;
  scheduleType: ScheduleType;
  scheduleCron: string;
  afterTask: string;
}

export interface AddWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function AddWizard({ onComplete, onCancel }: AddWizardProps = {}) {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>("name");
  const [draft, setDraft] = useState<TaskDraft>({
    name: "",
    agent: "claude",
    model: "",
    prompt: "",
    workingDir: process.cwd(),
    scheduleType: "cron",
    scheduleCron: "3 9 * * *",
    afterTask: "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [taskId, setTaskId] = useState("");

  const existingTasks = listTasks();
  const stepContext: StepContext = {
    agent: draft.agent,
    scheduleType: draft.scheduleType,
    hasExistingTasks: existingTasks.length > 0,
  };

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

  const agents = detectInstalledAgents();

  const agentItems = [
    ...agents.map((a) => ({
      label: `${a.installed ? "✓" : "✗"} ${a.name} (${a.binary})`,
      value: a.id,
    })),
    { label: "  Custom command", value: "custom" as AgentId },
  ];

  const scheduleItems = [
    { label: "Cron expression (e.g., daily at 9am)", value: "cron" as ScheduleType },
    { label: "Interval (e.g., every 30 minutes)", value: "interval" as ScheduleType },
    { label: "Manual only (run manually)", value: "manual" as ScheduleType },
  ];

  function formatScheduleSummary(): string {
    if (draft.scheduleType === "manual") return "Manual";
    if (draft.scheduleType === "interval") return `Every ${draft.scheduleCron} minutes`;
    return cronstrue.toString(draft.scheduleCron);
  }

  function handleConfirm() {
    try {
      const model = draft.model || undefined;
      const afterTask = draft.afterTask || undefined;

      const task = createTask({
        name: draft.name,
        agent: draft.agent,
        command: draft.prompt,
        workingDir: draft.workingDir,
        scheduleType: draft.scheduleType,
        scheduleCron: draft.scheduleType === "cron" ? draft.scheduleCron : undefined,
        scheduleIntervalSeconds:
          draft.scheduleType === "interval" && isValidInterval(draft.scheduleCron)
            ? Number.parseInt(draft.scheduleCron, 10) * 60
            : undefined,
        model,
        afterTask,
      });

      if (task.scheduleType !== "manual") {
        installPlist(task);
      }

      setTaskId(task.id);
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
          ✓ Task created: {draft.name} ({taskId})
        </Text>
        {draft.scheduleType !== "manual" && (
          <Text color="gray">launchd plist installed and loaded.</Text>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        reveille - New Task
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
              if (v.trim()) setStep(getNextStep("name", stepContext));
            }}
          />
        </Box>
      )}

      {step === "agent" && (
        <Box flexDirection="column">
          <Text>Select AI agent:</Text>
          <SelectInput
            items={agentItems}
            onSelect={(item) => {
              const newDraft = { ...draft, agent: item.value };
              setDraft(newDraft);
              setStep(
                getNextStep("agent", {
                  agent: item.value,
                  scheduleType: newDraft.scheduleType,
                }),
              );
            }}
          />
        </Box>
      )}

      {step === "model" && (
        <Box flexDirection="column">
          <Text>Model (leave empty for agent default):</Text>
          {getAvailableModels(draft.agent).length > 0 && (
            <Text color="gray">Suggestions: {getAvailableModels(draft.agent).join(", ")}</Text>
          )}
          <TextInput
            value={draft.model}
            onChange={(v) => setDraft({ ...draft, model: v })}
            onSubmit={() => {
              setStep(getNextStep("model", stepContext));
            }}
          />
        </Box>
      )}

      {step === "prompt" && (
        <Box flexDirection="column">
          <Text>{draft.agent === "custom" ? "Full command:" : "Prompt for the agent:"}</Text>
          <TextInput
            value={draft.prompt}
            onChange={(v) => setDraft({ ...draft, prompt: v })}
            onSubmit={(v) => {
              if (v.trim()) setStep(getNextStep("prompt", stepContext));
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
              if (v.trim()) setStep(getNextStep("workdir", stepContext));
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
              const defaultScheduleValue = item.value === "interval" ? "" : "3 9 * * *";
              const newDraft = {
                ...draft,
                scheduleType: item.value,
                scheduleCron: defaultScheduleValue,
              };
              setDraft(newDraft);
              setStep(
                getNextStep("schedule-type", {
                  agent: newDraft.agent,
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
              : "Interval in minutes:"}
          </Text>
          <TextInput
            value={draft.scheduleCron}
            placeholder={draft.scheduleType === "interval" ? "30" : undefined}
            onChange={(v) => setDraft({ ...draft, scheduleCron: v })}
            onSubmit={(v) => {
              const isValid =
                draft.scheduleType === "interval" ? isValidInterval(v) : v.trim() !== "";
              if (isValid) setStep(getNextStep("schedule-value", stepContext));
            }}
          />
          {draft.scheduleType === "cron" && draft.scheduleCron && (
            <Text color="gray">
              {(() => {
                try {
                  return cronstrue.toString(draft.scheduleCron);
                } catch {
                  return "(invalid cron)";
                }
              })()}
            </Text>
          )}
          {draft.scheduleType === "interval" && draft.scheduleCron && (
            <Text color="gray">
              {isValidInterval(draft.scheduleCron)
                ? `Every ${draft.scheduleCron} minutes`
                : "(enter a positive integer)"}
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
            onSubmit={() => {
              setStep(getNextStep("after-task", stepContext));
            }}
          />
        </Box>
      )}

      {step === "confirm" && (
        <Box flexDirection="column">
          <Text bold>Summary:</Text>
          <Text> Name: {draft.name}</Text>
          <Text> Agent: {draft.agent}</Text>
          {draft.model && <Text> Model: {draft.model}</Text>}
          <Text>
            {"  Prompt:    "}
            {draft.prompt}
          </Text>
          <Text> Directory: {draft.workingDir}</Text>
          <Text>
            {"  Schedule:  "}
            {formatScheduleSummary()}
          </Text>
          {draft.afterTask && (
            <Text>
              {"  After:     "}
              {draft.afterTask}
            </Text>
          )}
          <Text> </Text>
          <Text color="cyan">Press Enter to create, or Esc to go back.</Text>
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

export default async function add(args: string[]) {
  // Non-interactive mode via flags
  const nameIdx = args.indexOf("--name");
  const agentIdx = args.indexOf("--agent");
  const cmdIdx = args.indexOf("--cmd");
  const cronIdx = args.indexOf("--cron");
  const dirIdx = args.indexOf("--dir");
  const modelIdx = args.indexOf("--model");
  const afterIdx = args.indexOf("--after");

  if (nameIdx !== -1 && cmdIdx !== -1) {
    const name = args[nameIdx + 1];
    const agent = (agentIdx !== -1 ? args[agentIdx + 1] : "custom") as AgentId;
    const command = args[cmdIdx + 1];
    const cron = cronIdx !== -1 ? args[cronIdx + 1] : undefined;
    const dir = dirIdx !== -1 ? args[dirIdx + 1] : process.cwd();
    const model = modelIdx !== -1 ? args[modelIdx + 1] : undefined;
    const afterTask = afterIdx !== -1 ? args[afterIdx + 1] : undefined;

    const task = createTask({
      name,
      agent,
      command,
      workingDir: dir,
      scheduleType: cron ? "cron" : "manual",
      scheduleCron: cron,
      model,
      afterTask,
    });

    if (task.scheduleType !== "manual") {
      installPlist(task);
    }

    console.log(`✓ Task created: ${name} (${task.id})`);
    return;
  }

  // Interactive mode
  const { waitUntilExit } = render(<AddWizard />);
  await waitUntilExit();
}
