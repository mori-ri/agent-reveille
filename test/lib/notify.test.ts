import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type NotifyConfig,
  type NotifyProvider,
  formatNotificationMessage,
  buildSlackPayload,
  buildDiscordPayload,
  buildMacOSCommand,
  getEnabledProviders,
} from "../../src/lib/notify.js";
import type { Task, Execution } from "../../src/lib/schema.js";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    name: "Daily Tests",
    agent: "claude",
    command: 'claude -p "run tests"',
    workingDir: "/projects/myapp",
    scheduleType: "cron",
    scheduleCron: "0 9 * * *",
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeExecution(overrides: Partial<Execution> = {}): Execution {
  return {
    id: "e1",
    taskId: "t1",
    startedAt: "2026-04-04T09:00:00Z",
    finishedAt: "2026-04-04T09:05:00Z",
    exitCode: 0,
    status: "success",
    stdoutTail: "All 42 tests passed",
    ...overrides,
  };
}

describe("formatNotificationMessage", () => {
  it("should format a success message", () => {
    const msg = formatNotificationMessage(makeTask(), makeExecution());
    expect(msg.title).toContain("Daily Tests");
    expect(msg.title).toContain("success");
    expect(msg.body).toContain("5m");
    expect(msg.status).toBe("success");
  });

  it("should format a failure message", () => {
    const msg = formatNotificationMessage(
      makeTask(),
      makeExecution({ status: "failed", exitCode: 1 }),
    );
    expect(msg.title).toContain("failed");
    expect(msg.status).toBe("failed");
  });

  it("should format a timeout message", () => {
    const msg = formatNotificationMessage(
      makeTask(),
      makeExecution({ status: "timeout", exitCode: -1 }),
    );
    expect(msg.title).toContain("timeout");
    expect(msg.status).toBe("timeout");
  });

  it("should include stdout tail when available", () => {
    const msg = formatNotificationMessage(
      makeTask(),
      makeExecution({ stdoutTail: "Last output line" }),
    );
    expect(msg.body).toContain("Last output line");
  });
});

describe("buildSlackPayload", () => {
  it("should build a valid Slack webhook payload for success", () => {
    const msg = formatNotificationMessage(makeTask(), makeExecution());
    const payload = buildSlackPayload(msg);
    expect(payload.text).toContain("Daily Tests");
    expect(payload.attachments).toBeDefined();
    expect(payload.attachments[0].color).toBe("good");
  });

  it("should use danger color for failures", () => {
    const msg = formatNotificationMessage(
      makeTask(),
      makeExecution({ status: "failed", exitCode: 1 }),
    );
    const payload = buildSlackPayload(msg);
    expect(payload.attachments[0].color).toBe("danger");
  });
});

describe("buildDiscordPayload", () => {
  it("should build a valid Discord webhook payload", () => {
    const msg = formatNotificationMessage(makeTask(), makeExecution());
    const payload = buildDiscordPayload(msg);
    expect(payload.embeds).toBeDefined();
    expect(payload.embeds.length).toBe(1);
    expect(payload.embeds[0].title).toContain("Daily Tests");
    expect(payload.embeds[0].color).toBe(0x2ecc71); // green
  });

  it("should use red for failures", () => {
    const msg = formatNotificationMessage(
      makeTask(),
      makeExecution({ status: "failed", exitCode: 1 }),
    );
    const payload = buildDiscordPayload(msg);
    expect(payload.embeds[0].color).toBe(0xe74c3c); // red
  });
});

describe("buildMacOSCommand", () => {
  it("should return an osascript command", () => {
    const msg = formatNotificationMessage(makeTask(), makeExecution());
    const cmd = buildMacOSCommand(msg);
    expect(cmd).toContain("osascript");
    expect(cmd).toContain("display notification");
    expect(cmd).toContain("Daily Tests");
  });
});

describe("getEnabledProviders", () => {
  it("should return empty array when no config", () => {
    const providers = getEnabledProviders({});
    expect(providers).toEqual([]);
  });

  it("should return slack when webhook URL is set", () => {
    const providers = getEnabledProviders({
      slack: { webhookUrl: "https://hooks.slack.com/services/xxx" },
    });
    expect(providers).toContain("slack");
  });

  it("should return discord when webhook URL is set", () => {
    const providers = getEnabledProviders({
      discord: { webhookUrl: "https://discord.com/api/webhooks/xxx" },
    });
    expect(providers).toContain("discord");
  });

  it("should return macos when enabled", () => {
    const providers = getEnabledProviders({ macos: { enabled: true } });
    expect(providers).toContain("macos");
  });

  it("should return multiple providers", () => {
    const providers = getEnabledProviders({
      slack: { webhookUrl: "https://hooks.slack.com/services/xxx" },
      macos: { enabled: true },
    });
    expect(providers).toContain("slack");
    expect(providers).toContain("macos");
    expect(providers).toHaveLength(2);
  });

  it("should not return macos when disabled", () => {
    const providers = getEnabledProviders({ macos: { enabled: false } });
    expect(providers).not.toContain("macos");
  });
});
