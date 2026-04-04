import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

function getHome(): string {
  return process.env.REVEILLE_HOME ?? homedir();
}

export function getConfigDir(): string {
  const dir = join(getHome(), ".config", "reveille");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDataDir(): string {
  const dir = join(getHome(), ".local", "share", "reveille");
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
  return join(getHome(), "Library", "LaunchAgents");
}

export function getPlistPath(taskId: string): string {
  return join(getPlistDir(), `com.reveille.task.${taskId}.plist`);
}

export function getBinPath(): string {
  const argv1 = process.argv[1] ?? "";

  // In dev mode (.ts source), resolve the installed binary for plist generation
  if (argv1.endsWith(".ts")) {
    try {
      const resolved = execSync("which reveille", {
        encoding: "utf-8",
        timeout: 3000,
      }).trim();
      if (resolved && existsSync(resolved)) {
        return resolved;
      }
    } catch {
      // not installed globally
    }
  }

  return argv1 || "reveille";
}
