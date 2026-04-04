import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
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
  writeFileSync(getNotifyConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}

// --- Message formatting ---

export function formatNotificationMessage(task: Task, execution: Execution): NotificationMessage {
  const status = execution.status === "success" ? "success"
    : execution.status === "timeout" ? "timeout"
    : "failed";

  const statusEmoji = status === "success" ? "\u2713" : status === "timeout" ? "\u23f1" : "\u2717";
  const title = `${statusEmoji} ${task.name} — ${status}`;

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

export function buildSlackPayload(msg: NotificationMessage) {
  const color = msg.status === "success" ? "good" : msg.status === "timeout" ? "warning" : "danger";
  return {
    text: msg.title,
    attachments: [
      {
        color,
        text: msg.body,
        fallback: `${msg.title}\n${msg.body}`,
      },
    ],
  };
}

export function buildDiscordPayload(msg: NotificationMessage) {
  const color = msg.status === "success" ? 0x2ecc71 : msg.status === "timeout" ? 0xf39c12 : 0xe74c3c;
  return {
    embeds: [
      {
        title: msg.title,
        description: msg.body,
        color,
      },
    ],
  };
}

export function buildMacOSCommand(msg: NotificationMessage): string {
  const escaped = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `osascript -e 'display notification "${escaped(msg.body.split("\n")[0])}" with title "${escaped(msg.title)}" sound name "default"'`;
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
  const body = JSON.stringify(payload);
  try {
    execSync(`curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}' "${url}"`, {
      timeout: 10000,
    });
  } catch {
    // Silently fail - notifications should never block task execution
  }
}

export async function sendNotifications(task: Task, execution: Execution): Promise<void> {
  const config = loadNotifyConfig();
  const providers = getEnabledProviders(config);
  if (providers.length === 0) return;

  const msg = formatNotificationMessage(task, execution);

  const promises: Promise<void>[] = [];

  if (providers.includes("slack") && config.slack) {
    promises.push(sendWebhook(config.slack.webhookUrl, buildSlackPayload(msg)));
  }

  if (providers.includes("discord") && config.discord) {
    promises.push(sendWebhook(config.discord.webhookUrl, buildDiscordPayload(msg)));
  }

  if (providers.includes("macos")) {
    try {
      execSync(buildMacOSCommand(msg), { timeout: 5000 });
    } catch {
      // Silently fail
    }
  }

  await Promise.allSettled(promises);
}
