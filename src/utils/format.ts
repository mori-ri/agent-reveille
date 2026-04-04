import { formatDistanceToNow } from "date-fns";
import chalk from "chalk";
import cronstrue from "cronstrue";
import type { Task } from "../lib/schema.js";

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatAbsoluteTime(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatFullTime(isoString: string): string {
  const absolute = formatAbsoluteTime(isoString);
  const relative = formatRelativeTime(isoString);
  return `${absolute} (${relative})`;
}

export function formatSchedule(task: Task): string {
  if (task.scheduleType === "cron" && task.scheduleCron) {
    try {
      return cronstrue.toString(task.scheduleCron);
    } catch {
      return task.scheduleCron;
    }
  }
  if (task.scheduleType === "interval" && task.scheduleIntervalSeconds) {
    return `every ${Math.round(task.scheduleIntervalSeconds / 60)}m`;
  }
  return "manual";
}

export function formatStatus(status: string): string {
  switch (status) {
    case "active":
      return chalk.green("● active");
    case "paused":
      return chalk.yellow("● paused");
    case "running":
      return chalk.blue("◉ running");
    case "success":
      return chalk.green("✓ success");
    case "failed":
      return chalk.red("✗ failed");
    case "timeout":
      return chalk.red("⏱ timeout");
    case "manual":
      return chalk.gray("○ manual");
    default:
      return chalk.gray(status);
  }
}
