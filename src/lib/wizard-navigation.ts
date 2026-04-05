import type { AgentId, ScheduleType } from "./schema.js";

export type Step =
  | "name"
  | "agent"
  | "model"
  | "prompt"
  | "workdir"
  | "schedule-type"
  | "schedule-value"
  | "confirm";

export interface StepContext {
  agent: AgentId;
  scheduleType: ScheduleType;
}

const STEP_ORDER: Step[] = [
  "name",
  "agent",
  "model",
  "prompt",
  "workdir",
  "schedule-type",
  "schedule-value",
  "confirm",
];

function shouldSkip(step: Step, context: StepContext): boolean {
  if (step === "model" && context.agent === "custom") return true;
  if (step === "schedule-value" && context.scheduleType === "manual") return true;
  return false;
}

export function getNextStep(current: Step, context: StepContext): Step {
  const idx = STEP_ORDER.indexOf(current);
  for (let i = idx + 1; i < STEP_ORDER.length; i++) {
    if (!shouldSkip(STEP_ORDER[i], context)) return STEP_ORDER[i];
  }
  return current;
}

export function getPreviousStep(current: Step, context: StepContext): Step | null {
  const idx = STEP_ORDER.indexOf(current);
  for (let i = idx - 1; i >= 0; i--) {
    if (!shouldSkip(STEP_ORDER[i], context)) return STEP_ORDER[i];
  }
  return null;
}
