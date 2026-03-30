import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const home = homedir();

export function getConfigDir(): string {
  const dir = join(home, ".config", "cronai");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDataDir(): string {
  const dir = join(home, ".local", "share", "cronai");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getLogDir(taskId?: string): string {
  const base = join(getDataDir(), "logs");
  const dir = taskId ? join(base, taskId) : base;
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getTasksFilePath(): string {
  return join(getConfigDir(), "tasks.json");
}

export function getExecutionsFilePath(): string {
  return join(getConfigDir(), "executions.json");
}

export function getPlistDir(): string {
  return join(home, "Library", "LaunchAgents");
}

export function getPlistPath(taskId: string): string {
  return join(getPlistDir(), `com.cronai.task.${taskId}.plist`);
}

export function getBinPath(): string {
  return process.argv[1] ?? "cronai";
}
