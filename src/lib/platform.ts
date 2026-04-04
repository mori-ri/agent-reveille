import { platform } from "node:os";
import { installPlist, uninstallPlist, isLoaded } from "./scheduler.js";
import { installSystemdTimer, uninstallSystemdTimer, isSystemdTimerActive } from "./systemd.js";
import type { Task } from "./schema.js";

export type Platform = "macos" | "linux" | "unsupported";

export function detectPlatform(): Platform {
  const p = platform();
  if (p === "darwin") return "macos";
  if (p === "linux") return "linux";
  return "unsupported";
}

export interface SchedulerBackend {
  install(task: Task): void;
  uninstall(taskId: string): void;
  isActive(taskId: string): boolean;
}

export function getScheduler(): SchedulerBackend {
  const p = detectPlatform();

  if (p === "macos") {
    return {
      install: (task) => installPlist(task),
      uninstall: (taskId) => uninstallPlist(taskId),
      isActive: (taskId) => isLoaded(taskId),
    };
  }

  if (p === "linux") {
    return {
      install: (task) => installSystemdTimer(task),
      uninstall: (taskId) => uninstallSystemdTimer(taskId),
      isActive: (taskId) => isSystemdTimerActive(taskId),
    };
  }

  throw new Error(`Unsupported platform: ${platform()}. reveille supports macOS (launchd) and Linux (systemd).`);
}
