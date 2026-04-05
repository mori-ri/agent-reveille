import { execSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { serializePlist } from "../utils/plist.js";
import { getBinPath, getPlistDir, getPlistPath } from "./paths.js";
import type { Task } from "./schema.js";

interface CalendarInterval {
  Minute?: number;
  Hour?: number;
  Day?: number;
  Month?: number;
  Weekday?: number;
}

export function cronToCalendarIntervals(cron: string): CalendarInterval[] {
  // Parse cron to extract the fields
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Invalid cron expression: ${cron}`);
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

  const interval: CalendarInterval = {};

  if (minute !== "*" && !minute.includes("/") && !minute.includes(",")) {
    interval.Minute = Number.parseInt(minute, 10);
  }
  if (hour !== "*" && !hour.includes("/") && !hour.includes(",")) {
    interval.Hour = Number.parseInt(hour, 10);
  }
  if (dayOfMonth !== "*" && !dayOfMonth.includes("/") && !dayOfMonth.includes(",")) {
    interval.Day = Number.parseInt(dayOfMonth, 10);
  }
  if (month !== "*" && !month.includes("/") && !month.includes(",")) {
    interval.Month = Number.parseInt(month, 10);
  }
  if (dayOfWeek !== "*" && !dayOfWeek.includes("/") && !dayOfWeek.includes(",")) {
    interval.Weekday = Number.parseInt(dayOfWeek, 10);
  }

  // For interval expressions like */5, use StartInterval instead
  // This function only handles calendar-based scheduling
  return [interval];
}

export function cronToIntervalSeconds(cron: string): number | null {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) return null;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

  // Only handle simple */N minute patterns
  if (
    minute.startsWith("*/") &&
    hour === "*" &&
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*"
  ) {
    const n = Number.parseInt(minute.slice(2), 10);
    if (!Number.isNaN(n) && n > 0) return n * 60;
  }

  return null;
}

function getUserPath(): string {
  try {
    const shell = process.env.SHELL ?? "/bin/zsh";
    const path = execSync(`${shell} -l -c 'echo $PATH'`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    return path;
  } catch {
    return process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin";
  }
}

export function generatePlist(task: Task): string {
  const binPath = getBinPath();
  const label = `com.reveille.task.${task.id}`;

  const plist: Record<string, unknown> = {
    Label: label,
    ProgramArguments: [binPath, "run", task.id],
    WorkingDirectory: task.workingDir,
    EnvironmentVariables: {
      PATH: getUserPath(),
      HOME: process.env.HOME ?? "",
    },
    StandardOutPath: `/tmp/reveille-${task.id}.stdout.log`,
    StandardErrorPath: `/tmp/reveille-${task.id}.stderr.log`,
    RunAtLoad: false,
  };

  if (task.scheduleType === "interval" && task.scheduleIntervalSeconds) {
    plist.StartInterval = task.scheduleIntervalSeconds;
  } else if (task.scheduleType === "cron" && task.scheduleCron) {
    // Check if it's a simple interval pattern first
    const intervalSeconds = cronToIntervalSeconds(task.scheduleCron);
    if (intervalSeconds !== null) {
      plist.StartInterval = intervalSeconds;
    } else {
      const intervals = cronToCalendarIntervals(task.scheduleCron);
      if (intervals.length === 1) {
        plist.StartCalendarInterval = intervals[0];
      } else {
        plist.StartCalendarInterval = intervals;
      }
    }
  }

  return serializePlist(plist as Record<string, never>);
}

function shouldSkipLaunchctl(): boolean {
  return !!process.env.REVEILLE_SKIP_LAUNCHCTL;
}

export function installPlist(task: Task): void {
  const path = getPlistPath(task.id);
  const content = generatePlist(task);

  // Ensure LaunchAgents directory exists
  const dir = getPlistDir();
  mkdirSync(dir, { recursive: true });

  if (!shouldSkipLaunchctl()) {
    // Unload first if already loaded
    try {
      execSync(`launchctl unload ${path}`, { stdio: "ignore" });
    } catch {
      // Ignore - may not be loaded
    }
  }

  writeFileSync(path, content, "utf-8");

  if (!shouldSkipLaunchctl()) {
    execSync(`launchctl load ${path}`);
  }
}

export function uninstallPlist(taskId: string): void {
  const path = getPlistPath(taskId);
  if (!existsSync(path)) return;

  if (!shouldSkipLaunchctl()) {
    try {
      execSync(`launchctl unload ${path}`, { stdio: "ignore" });
    } catch {
      // Ignore
    }
  }

  unlinkSync(path);
}

export function isLoaded(taskId: string): boolean {
  if (shouldSkipLaunchctl()) return false;

  const label = `com.reveille.task.${taskId}`;
  try {
    execSync(`launchctl list ${label}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
