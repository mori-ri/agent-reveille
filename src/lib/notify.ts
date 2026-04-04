import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { getConfigDir } from "./paths.js";
import { formatDuration } from "../utils/format.js";
import type { Task, Execution } from "./schema.js";

// --- Types ---

export type NotifyProvider = "slack" | "discord" | "macos";

export interface SlackConfig {
  webhookUrl: string;
}

export interface DiscordConfig {
  webhookUrl: string;
}

export interface MacOSConfig {
  enabled: boolean;
}

export interface NotifyConfig {
  slack?: SlackConfig;
  discord?: DiscordConfig;
  macos?: MacOSConfig;
}

export interface NotificationMessage {
  title: string;
  body: string;
  status: "success" | "failed" | "timeout";
}

// --- Config persistence ---

function getNotifyConfigPath(): string {
  return join(getConfigDir(), "notify.json");
}

export function loadNotifyConfig(): NotifyConfig {
  const path = getNotifyConfigPath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as NotifyConfig;
  } catch {
    return {};
  }
}

export function saveNotifyConfig(config: NotifyConfig): void {
  const path = getNotifyConfigPath();
  const tmpPath = path + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(config, null, 2), "utf-8");
  renameSync(tmpPath, path);
}

// --- Message formatting ---

function statusFromExecution(execution: Execution): "success" | "failed" | "timeout" {
  if (execution.status === "success") return "success";
  if (execution.status === "timeout") return "timeout";
  return "failed";
}

const STATUS_ICONS: Record<NotificationMessage["status"], string> = {
  success: "\u2713",
  timeout: "\u23f1",
  failed: "\u2717",
};

export function formatNotificationMessage(task: Task, execution: Execution): NotificationMessage {
  const status = statusFromExecution(execution);
  const title = `${STATUS_ICONS[status]} ${task.name} \u2014 ${status}`;

  const parts: string[] = [];

  if (execution.finishedAt) {
    const durationMs = new Date(execution.finishedAt).getTime() - new Date(execution.startedAt).getTime();
    parts.push(`Duration: ${formatDuration(durationMs)}`);
  }

  parts.push(`Exit code: ${execution.exitCode ?? "N/A"}`);

  if (execution.stdoutTail) {
    parts.push(`Output: ${execution.stdoutTail.slice(0, 200)}`);
  }

  return { title, body: parts.join("\n"), status };
}

// --- Provider payloads ---

const SLACK_COLORS: Record<NotificationMessage["status"], string> = {
  success: "good",
  timeout: "warning",
  failed: "danger",
};

export function buildSlackPayload(msg: NotificationMessage): { text: string; attachments: Array<{ color: string; text: string; fallback: string }> } {
  return {
    text: msg.title,
    attachments: [
      {
        color: SLACK_COLORS[msg.status],
        text: msg.body,
        fallback: `${msg.title}\n${msg.body}`,
      },
    ],
  };
}

const DISCORD_COLORS: Record<NotificationMessage["status"], number> = {
  success: 0x2ecc71,
  timeout: 0xf39c12,
  failed: 0xe74c3c,
};

export function buildDiscordPayload(msg: NotificationMessage): { embeds: Array<{ title: string; description: string; color: number }> } {
  return {
    embeds: [
      {
        title: msg.title,
        description: msg.body,
        color: DISCORD_COLORS[msg.status],
      },
    ],
  };
}

export function buildMacOSNotificationArgs(msg: NotificationMessage): string[] {
  const body = msg.body.split("\n")[0];
  const script = `display notification ${JSON.stringify(body)} with title ${JSON.stringify(msg.title)} sound name "default"`;
  return ["-e", script];
}

// --- Provider detection ---

export function getEnabledProviders(config: NotifyConfig): NotifyProvider[] {
  const providers: NotifyProvider[] = [];
  if (config.slack?.webhookUrl) providers.push("slack");
  if (config.discord?.webhookUrl) providers.push("discord");
  if (config.macos?.enabled) providers.push("macos");
  return providers;
}

// --- Send notifications ---

async function sendWebhook(url: string, payload: unknown): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Silently fail - notifications should never block task execution
  }
}

function sendMacOSNotification(msg: NotificationMessage): Promise<void> {
  return new Promise((resolve) => {
    execFile("osascript", buildMacOSNotificationArgs(msg), { timeout: 5000 }, () => {
      // Resolve regardless of success or failure
      resolve();
    });
  });
}

export async function sendNotifications(task: Task, execution: Execution): Promise<void> {
  const config = loadNotifyConfig();
  const providers = getEnabledProviders(config);
  if (providers.length === 0) return;

  const msg = formatNotificationMessage(task, execution);

  const promises: Promise<void>[] = [];

  if (config.slack) {
    promises.push(sendWebhook(config.slack.webhookUrl, buildSlackPayload(msg)));
  }

  if (config.discord) {
    promises.push(sendWebhook(config.discord.webhookUrl, buildDiscordPayload(msg)));
  }

  if (providers.includes("macos")) {
    promises.push(sendMacOSNotification(msg));
  }

  await Promise.allSettled(promises);
}
