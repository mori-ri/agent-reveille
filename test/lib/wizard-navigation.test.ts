import { describe, expect, it } from "vitest";
import { type StepContext, getNextStep, getPreviousStep } from "../../src/lib/wizard-navigation.js";

const defaultCtx: StepContext = { agent: "claude", scheduleType: "cron" };
const customCtx: StepContext = { agent: "custom", scheduleType: "cron" };
const manualCtx: StepContext = { agent: "claude", scheduleType: "manual" };

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

  it("returns 'schedule-value' from 'confirm' for non-manual schedule", () => {
    expect(getPreviousStep("confirm", defaultCtx)).toBe("schedule-value");
  });

  it("skips 'schedule-value' and returns 'schedule-type' from 'confirm' for manual schedule", () => {
    expect(getPreviousStep("confirm", manualCtx)).toBe("schedule-type");
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

  it("skips 'schedule-value' and returns 'confirm' from 'schedule-type' for manual schedule", () => {
    expect(getNextStep("schedule-type", manualCtx)).toBe("confirm");
  });

  it("returns 'confirm' from 'schedule-value'", () => {
    expect(getNextStep("schedule-value", defaultCtx)).toBe("confirm");
  });
});
