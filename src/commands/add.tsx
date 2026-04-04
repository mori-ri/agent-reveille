import React, { useState } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { createTask } from "../lib/tasks.js";
import { installPlist } from "../lib/scheduler.js";
import { detectInstalledAgents, buildCommand } from "../lib/agents.js";
import { listTemplates, templateToTaskInput } from "../lib/templates.js";
import type { AgentId, ScheduleType } from "../lib/schema.js";
import type { TaskTemplate } from "../lib/templates.js";
import cronstrue from "cronstrue";

type Step = "template" | "name" | "agent" | "prompt" | "workdir" | "schedule-type" | "schedule-value" | "confirm";

interface TaskDraft {
  name: string;
  agent: AgentId;
  prompt: string;
  workingDir: string;
  scheduleType: ScheduleType;
  scheduleCron: string;
  command: string;
}

export function AddWizard() {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [draft, setDraft] = useState<TaskDraft>({
    name: "",
    agent: "claude",
    prompt: "",
    workingDir: process.cwd(),
    scheduleType: "cron",
    scheduleCron: "3 9 * * *",
    command: "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [taskId, setTaskId] = useState("");

  const agents = detectInstalledAgents();
  const templates = listTemplates();

  const templateItems = [
    ...templates.map((t) => ({
      label: `${t.label} — ${t.description}`,
      value: t.id,
    })),
    { label: "Custom (start from scratch)", value: "__custom__" },
  ];

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

  function handleConfirm() {
    try {
      const command =
        draft.agent === "custom" ? draft.prompt : buildCommand(draft.agent, draft.prompt);

      const task = createTask({
        name: draft.name,
        agent: draft.agent,
        command,
        workingDir: draft.workingDir,
        scheduleType: draft.scheduleType,
        scheduleCron: draft.scheduleType === "cron" ? draft.scheduleCron : undefined,
        scheduleIntervalSeconds:
          draft.scheduleType === "interval" ? parseInt(draft.scheduleCron) * 60 : undefined,
      });

      if (task.scheduleType !== "manual") {
        installPlist(task);
      }

      setTaskId(task.id);
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

      {step === "template" && (
        <Box flexDirection="column">
          <Text>Start from a template or create custom:</Text>
          <SelectInput
            items={templateItems}
            onSelect={(item) => {
              if (item.value === "__custom__") {
                setStep("name");
              } else {
                const tmpl = templates.find((t) => t.id === item.value)!;
                setSelectedTemplate(tmpl);
                setDraft({
                  ...draft,
                  name: tmpl.label,
                  agent: tmpl.agent,
                  prompt: tmpl.prompt,
                  scheduleType: tmpl.scheduleType,
                  scheduleCron: tmpl.scheduleCron ?? draft.scheduleCron,
                });
                setStep("workdir");
              }
            }}
          />
        </Box>
      )}

      {step === "name" && (
        <Box flexDirection="column">
          <Text>Task name:</Text>
          <TextInput
            value={draft.name}
            onChange={(v) => setDraft({ ...draft, name: v })}
            onSubmit={(v) => {
              if (v.trim()) setStep("agent");
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
              setDraft({ ...draft, agent: item.value });
              setStep("prompt");
            }}
          />
        </Box>
      )}

      {step === "prompt" && (
        <Box flexDirection="column">
          <Text>
            {draft.agent === "custom" ? "Full command:" : "Prompt for the agent:"}
          </Text>
          <TextInput
            value={draft.prompt}
            onChange={(v) => setDraft({ ...draft, prompt: v })}
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
              : "Interval in minutes:"}
          </Text>
          <TextInput
            value={draft.scheduleCron}
            onChange={(v) => setDraft({ ...draft, scheduleCron: v })}
            onSubmit={(v) => {
              if (v.trim()) setStep("confirm");
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
        </Box>
      )}

      {step === "confirm" && (
        <Box flexDirection="column">
          <Text bold>Summary:</Text>
          <Text>  Name:      {draft.name}</Text>
          <Text>  Agent:     {draft.agent}</Text>
          <Text>
            {"  Command:   "}
            {draft.agent === "custom"
              ? draft.prompt
              : buildCommand(draft.agent, draft.prompt)}
          </Text>
          <Text>  Directory: {draft.workingDir}</Text>
          <Text>
            {"  Schedule:  "}
            {draft.scheduleType === "manual"
              ? "Manual"
              : draft.scheduleType === "cron"
                ? cronstrue.toString(draft.scheduleCron)
                : `Every ${draft.scheduleCron} minutes`}
          </Text>
          <Text> </Text>
          <Text color="cyan">Press Enter to create, or Ctrl+C to cancel.</Text>
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
  const templateIdx = args.indexOf("--template");

  // Template-based non-interactive mode
  if (templateIdx !== -1) {
    const templateId = args[templateIdx + 1];
    const { getTemplate, templateToTaskInput } = await import("../lib/templates.js");
    const tmpl = getTemplate(templateId);
    if (!tmpl) {
      console.error(`Unknown template: ${templateId}`);
      console.error(`Available: ${listTemplates().map((t) => t.id).join(", ")}`);
      process.exit(1);
    }
    const dir = dirIdx !== -1 ? args[dirIdx + 1] : process.cwd();
    const name = nameIdx !== -1 ? args[nameIdx + 1] : undefined;
    const cron = cronIdx !== -1 ? args[cronIdx + 1] : undefined;
    const input = templateToTaskInput(tmpl, { workingDir: dir, name, scheduleCron: cron });
    const task = createTask(input);

    if (task.scheduleType !== "manual") {
      installPlist(task);
    }

    console.log(`✓ Task created from template "${tmpl.label}": ${task.name} (${task.id})`);
    return;
  }

  if (nameIdx !== -1 && cmdIdx !== -1) {
    const name = args[nameIdx + 1];
    const agent = (agentIdx !== -1 ? args[agentIdx + 1] : "custom") as AgentId;
    const command = args[cmdIdx + 1];
    const cron = cronIdx !== -1 ? args[cronIdx + 1] : undefined;
    const dir = dirIdx !== -1 ? args[dirIdx + 1] : process.cwd();

    const task = createTask({
      name,
      agent,
      command,
      workingDir: dir,
      scheduleType: cron ? "cron" : "manual",
      scheduleCron: cron,
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
