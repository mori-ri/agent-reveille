import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AddWizard, isValidInterval } from "../../../src/commands/add.js";
import { type TestEnv, createTestEnv } from "../../helpers/setup.js";

const ENTER = "\r";
const DOWN = "j";

function delay(ms = 50): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe("isValidInterval", () => {
  it("accepts positive integers", () => {
    expect(isValidInterval("1")).toBe(true);
    expect(isValidInterval("30")).toBe(true);
    expect(isValidInterval("1440")).toBe(true);
  });

  it("rejects zero", () => {
    expect(isValidInterval("0")).toBe(false);
  });

  it("rejects negative numbers", () => {
    expect(isValidInterval("-1")).toBe(false);
    expect(isValidInterval("-30")).toBe(false);
  });

  it("rejects decimals", () => {
    expect(isValidInterval("1.5")).toBe(false);
    expect(isValidInterval("0.5")).toBe(false);
  });

  it("rejects non-numeric strings", () => {
    expect(isValidInterval("abc")).toBe(false);
    expect(isValidInterval("thirty")).toBe(false);
  });

  it("rejects cron expressions", () => {
    expect(isValidInterval("3 9 * * *")).toBe(false);
    expect(isValidInterval("*/5 * * * *")).toBe(false);
  });

  it("rejects empty and whitespace-only strings", () => {
    expect(isValidInterval("")).toBe(false);
    expect(isValidInterval("   ")).toBe(false);
  });
});

describe("AddWizard component — interval schedule", () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv();
  });

  afterEach(() => {
    env.cleanup();
  });

  /**
   * Navigate the wizard to the schedule-value step with interval selected.
   * Steps: name → agent → model → prompt → workdir → schedule-type(interval) → schedule-value
   */
  async function navigateToScheduleValue(stdin: { write: (data: string) => void }) {
    // name step — type a name and submit
    stdin.write("test-task");
    await delay();
    stdin.write(ENTER);
    await delay();

    // agent step — select first (claude) by pressing enter
    stdin.write(ENTER);
    await delay();

    // model step — leave empty, press enter
    stdin.write(ENTER);
    await delay();

    // prompt step — type a prompt and submit
    stdin.write("do something");
    await delay();
    stdin.write(ENTER);
    await delay();

    // workdir step — accept default (cwd), press enter
    stdin.write(ENTER);
    await delay();

    // schedule-type step — navigate to "interval" (2nd item) and select
    stdin.write(DOWN); // move from cron to interval
    await delay();
    stdin.write(ENTER); // select interval
    await delay();
  }

  it("clears cron default value when interval is selected", async () => {
    const { lastFrame, stdin, cleanup } = render(<AddWizard onComplete={() => {}} />);
    await delay();

    await navigateToScheduleValue(stdin);

    // Now at schedule-value step — the input should be empty (cron default cleared)
    const frame = lastFrame()!;
    expect(frame).toContain("Interval in minutes");
    // The old cron default "3 9 * * *" should NOT appear
    expect(frame).not.toContain("3 9 * * *");

    cleanup();
  });

  it("does not advance from schedule-value with invalid interval input", async () => {
    const { lastFrame, stdin, cleanup } = render(<AddWizard onComplete={() => {}} />);
    await delay();

    await navigateToScheduleValue(stdin);

    // Type an invalid value (not a positive integer)
    stdin.write("abc");
    await delay();
    stdin.write(ENTER);
    await delay();

    // Should still be on schedule-value step
    const frame = lastFrame()!;
    expect(frame).toContain("Interval in minutes");

    cleanup();
  });

  it("shows interval preview text for valid input", async () => {
    const { lastFrame, stdin, cleanup } = render(<AddWizard onComplete={() => {}} />);
    await delay();

    await navigateToScheduleValue(stdin);

    // Type a valid interval
    stdin.write("30");
    await delay();

    const frame = lastFrame()!;
    expect(frame).toContain("Every 30 minutes");

    cleanup();
  });

  it("shows validation hint for invalid interval input", async () => {
    const { lastFrame, stdin, cleanup } = render(<AddWizard onComplete={() => {}} />);
    await delay();

    await navigateToScheduleValue(stdin);

    // Type an invalid interval value
    stdin.write("abc");
    await delay();

    const frame = lastFrame()!;
    expect(frame).toContain("(enter a positive integer)");

    cleanup();
  });
});
