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
  name: string;
  install(task: Task): void;
  uninstall(taskId: string): void;
  isActive(taskId: string): boolean;
}

const macosBackend: SchedulerBackend = {
  name: "launchd plist",
  install: installPlist,
  uninstall: uninstallPlist,
  isActive: isLoaded,
};

const linuxBackend: SchedulerBackend = {
  name: "systemd timer",
  install: installSystemdTimer,
  uninstall: uninstallSystemdTimer,
  isActive: isSystemdTimerActive,
};

let cachedScheduler: SchedulerBackend | undefined;

export function getScheduler(): SchedulerBackend {
  if (cachedScheduler) return cachedScheduler;

  const p = detectPlatform();

  if (p === "macos") {
    cachedScheduler = macosBackend;
    return cachedScheduler;
  }

  if (p === "linux") {
    cachedScheduler = linuxBackend;
    return cachedScheduler;
  }

  throw new Error(`Unsupported platform: ${platform()}. reveille supports macOS (launchd) and Linux (systemd).`);
}
