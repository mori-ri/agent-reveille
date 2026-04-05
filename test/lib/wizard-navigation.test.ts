import { describe, expect, it } from "vitest";
import { type StepContext, getNextStep, getPreviousStep } from "../../src/lib/wizard-navigation.js";

const defaultCtx: StepContext = { agent: "claude", scheduleType: "cron" };
const customCtx: StepContext = { agent: "custom", scheduleType: "cron" };
const manualCtx: StepContext = { agent: "claude", scheduleType: "manual" };
const editCtx: StepContext = { agent: "claude", scheduleType: "cron", skipAgent: true };
const editCustomCtx: StepContext = { agent: "custom", scheduleType: "cron", skipAgent: true };

describe("getPreviousStep", () => {
  it("returns null for the first step", () => {
    expect(getPreviousStep("name", defaultCtx)).toBeNull();
  });

  it("returns 'name' from 'agent'", () => {
    expect(getPreviousStep("agent", defaultCtx)).toBe("name");
  });

  it("returns 'agent' from 'model'", () => {
    expect(getPreviousStep("model", defaultCtx)).toBe("agent");
  });

  it("returns 'model' from 'prompt' for non-custom agent", () => {
    expect(getPreviousStep("prompt", defaultCtx)).toBe("model");
  });

  it("skips 'model' and returns 'agent' from 'prompt' for custom agent", () => {
    expect(getPreviousStep("prompt", customCtx)).toBe("agent");
  });

  it("returns 'prompt' from 'workdir'", () => {
    expect(getPreviousStep("workdir", defaultCtx)).toBe("prompt");
  });

  it("returns 'workdir' from 'schedule-type'", () => {
    expect(getPreviousStep("schedule-type", defaultCtx)).toBe("workdir");
  });

  it("returns 'schedule-type' from 'schedule-value'", () => {
    expect(getPreviousStep("schedule-value", defaultCtx)).toBe("schedule-type");
  });

  it("returns 'schedule-value' from 'after-task' for non-manual schedule", () => {
    expect(getPreviousStep("after-task", defaultCtx)).toBe("schedule-value");
  });

  it("returns 'after-task' from 'confirm' when existing tasks", () => {
    expect(getPreviousStep("confirm", defaultCtx)).toBe("after-task");
  });

  it("skips 'after-task' and returns 'schedule-value' from 'confirm' when no existing tasks", () => {
    const ctx: StepContext = { agent: "claude", scheduleType: "cron", hasExistingTasks: false };
    expect(getPreviousStep("confirm", ctx)).toBe("schedule-value");
  });

  it("skips 'schedule-value' and 'after-task' from 'confirm' for manual with no existing tasks", () => {
    const ctx: StepContext = { agent: "claude", scheduleType: "manual", hasExistingTasks: false };
    expect(getPreviousStep("confirm", ctx)).toBe("schedule-type");
  });
});

describe("getNextStep", () => {
  it("returns 'agent' from 'name'", () => {
    expect(getNextStep("name", defaultCtx)).toBe("agent");
  });

  it("returns 'model' from 'agent' for non-custom agent", () => {
    expect(getNextStep("agent", defaultCtx)).toBe("model");
  });

  it("skips 'model' and returns 'prompt' from 'agent' for custom agent", () => {
    expect(getNextStep("agent", customCtx)).toBe("prompt");
  });

  it("returns 'prompt' from 'model'", () => {
    expect(getNextStep("model", defaultCtx)).toBe("prompt");
  });

  it("returns 'workdir' from 'prompt'", () => {
    expect(getNextStep("prompt", defaultCtx)).toBe("workdir");
  });

  it("returns 'schedule-type' from 'workdir'", () => {
    expect(getNextStep("workdir", defaultCtx)).toBe("schedule-type");
  });

  it("returns 'schedule-value' from 'schedule-type' for non-manual schedule", () => {
    expect(getNextStep("schedule-type", defaultCtx)).toBe("schedule-value");
  });

  it("skips 'schedule-value' and returns 'after-task' from 'schedule-type' for manual schedule", () => {
    expect(getNextStep("schedule-type", manualCtx)).toBe("after-task");
  });

  it("returns 'after-task' from 'schedule-value'", () => {
    expect(getNextStep("schedule-value", defaultCtx)).toBe("after-task");
  });

  it("returns 'confirm' from 'after-task'", () => {
    expect(getNextStep("after-task", defaultCtx)).toBe("confirm");
  });

  it("skips 'after-task' when no existing tasks", () => {
    const ctx: StepContext = { agent: "claude", scheduleType: "cron", hasExistingTasks: false };
    expect(getNextStep("schedule-value", ctx)).toBe("confirm");
  });

  it("skips both 'schedule-value' and 'after-task' for manual with no existing tasks", () => {
    const ctx: StepContext = { agent: "claude", scheduleType: "manual", hasExistingTasks: false };
    expect(getNextStep("schedule-type", ctx)).toBe("confirm");
  });

  it("skips 'agent' and returns 'model' from 'name' when skipAgent is true", () => {
    expect(getNextStep("name", editCtx)).toBe("model");
  });

  it("skips 'agent' and 'model' from 'name' for custom agent with skipAgent", () => {
    expect(getNextStep("name", editCustomCtx)).toBe("prompt");
  });
});

describe("getPreviousStep with skipAgent", () => {
  it("skips 'agent' and returns 'name' from 'model' when skipAgent is true", () => {
    expect(getPreviousStep("model", editCtx)).toBe("name");
  });

  it("skips 'agent' and 'model' and returns 'name' from 'prompt' for custom agent with skipAgent", () => {
    expect(getPreviousStep("prompt", editCustomCtx)).toBe("name");
  });
});
