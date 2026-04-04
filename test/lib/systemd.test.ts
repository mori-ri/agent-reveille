import { describe, it, expect } from "vitest";
import {
  generateServiceUnit,
  generateTimerUnit,
  cronToOnCalendar,
} from "../../src/lib/systemd.js";
import type { Task } from "../../src/lib/schema.js";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "abc123",
    name: "Test Task",
    agent: "claude",
    command: 'claude -p "test"',
    workingDir: "/home/user/project",
    scheduleType: "cron",
    scheduleCron: "0 9 * * *",
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("cronToOnCalendar", () => {
  it("should convert daily at 9am", () => {
    expect(cronToOnCalendar("0 9 * * *")).toBe("*-*-* 09:00:00");
  });

  it("should convert every Monday at midnight", () => {
    expect(cronToOnCalendar("0 0 * * 1")).toBe("Mon *-*-* 00:00:00");
  });

  it("should convert specific day and month", () => {
    expect(cronToOnCalendar("30 14 15 6 *")).toBe("*-06-15 14:30:00");
  });

  it("should convert weekday range", () => {
    expect(cronToOnCalendar("0 10 * * 1-5")).toBe("Mon..Fri *-*-* 10:00:00");
  });

  it("should handle every minute", () => {
    expect(cronToOnCalendar("* * * * *")).toBe("*-*-* *:*:00");
  });

  it("should convert */5 minute interval", () => {
    expect(cronToOnCalendar("*/5 * * * *")).toBe("*-*-* *:00/5:00");
  });
});

describe("generateServiceUnit", () => {
  it("should generate a valid systemd service unit", () => {
    const unit = generateServiceUnit(makeTask(), "/usr/local/bin/reveille");
    expect(unit).toContain("[Unit]");
    expect(unit).toContain("[Service]");
    expect(unit).toContain('ExecStart=/usr/local/bin/reveille run abc123');
    expect(unit).toContain("WorkingDirectory=/home/user/project");
    expect(unit).toContain("Type=oneshot");
  });

  it("should include PATH in environment", () => {
    const unit = generateServiceUnit(makeTask(), "/usr/local/bin/reveille", "/usr/local/bin:/usr/bin");
    expect(unit).toContain('Environment="PATH=/usr/local/bin:/usr/bin"');
  });
});

describe("generateTimerUnit", () => {
  it("should generate a cron-based timer", () => {
    const unit = generateTimerUnit(makeTask());
    expect(unit).toContain("[Unit]");
    expect(unit).toContain("[Timer]");
    expect(unit).toContain("[Install]");
    expect(unit).toContain("OnCalendar=");
    expect(unit).toContain("WantedBy=timers.target");
  });

  it("should generate an interval-based timer", () => {
    const task = makeTask({
      scheduleType: "interval",
      scheduleIntervalSeconds: 300,
      scheduleCron: undefined,
    });
    const unit = generateTimerUnit(task);
    expect(unit).toContain("OnUnitActiveSec=300s");
    expect(unit).toContain("OnBootSec=300s");
  });
});
