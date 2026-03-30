import { formatDistanceToNow } from "date-fns";
import chalk from "chalk";

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
