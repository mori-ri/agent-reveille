import { buildCommand } from "./agents.js";
import type { AgentId, ScheduleType, CreateTaskInput } from "./schema.js";

export interface TaskTemplate {
  id: string;
  label: string;
  description: string;
  agent: AgentId;
  prompt: string;
  scheduleType: ScheduleType;
  scheduleCron?: string;
  scheduleIntervalSeconds?: number;
}

export const TEMPLATES: TaskTemplate[] = [
  {
    id: "daily-tests",
    label: "Daily Tests",
    description: "Run the project test suite every morning and report failures",
    agent: "claude",
    prompt: "Run the test suite. If any tests fail, create a concise summary of failures with file paths and suggested fixes.",
    scheduleType: "cron",
    scheduleCron: "0 9 * * *",
  },
  {
    id: "lint-patrol",
    label: "Lint Patrol",
    description: "Check for lint errors and auto-fix what's possible",
    agent: "claude",
    prompt: "Run the linter. Fix any auto-fixable issues and commit the changes. For non-auto-fixable issues, list them with file paths.",
    scheduleType: "cron",
    scheduleCron: "0 10 * * 1-5",
  },
  {
    id: "daily-notes",
    label: "Daily Notes",
    description: "Generate a summary of recent git activity and open issues",
    agent: "claude",
    prompt: "Summarize yesterday's git commits and any open issues or PRs. Write a brief daily digest to DAILY_NOTES.md.",
    scheduleType: "cron",
    scheduleCron: "0 9 * * 1-5",
  },
  {
    id: "eod-reflection",
    label: "End-of-Day Reflection",
    description: "Review the day's changes and suggest improvements",
    agent: "claude",
    prompt: "Review today's git commits. Summarize what was accomplished, flag any potential issues or tech debt introduced, and suggest priorities for tomorrow.",
    scheduleType: "cron",
    scheduleCron: "0 18 * * 1-5",
  },
];

export function getTemplate(id: string): TaskTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function listTemplates(): TaskTemplate[] {
  return TEMPLATES;
}

export interface TemplateOverrides {
  workingDir: string;
  name?: string;
  scheduleCron?: string;
}

export function templateToTaskInput(
  template: TaskTemplate,
  overrides: TemplateOverrides,
): CreateTaskInput {
  const command = buildCommand(template.agent, template.prompt);

  const input: CreateTaskInput = {
    name: overrides.name ?? template.label,
    agent: template.agent,
    command,
    workingDir: overrides.workingDir,
    scheduleType: template.scheduleType,
  };

  if (template.scheduleType === "cron") {
    input.scheduleCron = overrides.scheduleCron ?? template.scheduleCron;
  }

  if (template.scheduleType === "interval" && template.scheduleIntervalSeconds) {
    input.scheduleIntervalSeconds = template.scheduleIntervalSeconds;
  }

  return input;
}
