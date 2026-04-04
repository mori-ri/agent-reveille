import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { getBinPath } from "./paths.js";
import type { Task } from "./schema.js";

// --- Cron to OnCalendar conversion ---

const DOW_MAP: Record<string, string> = {
  "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed",
  "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun",
};

export function cronToOnCalendar(cron: string): string {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error(`Invalid cron: ${cron}`);

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

  let dow = "";
  if (dayOfWeek !== "*") {
    if (dayOfWeek.includes("-")) {
      const [from, to] = dayOfWeek.split("-");
      dow = `${DOW_MAP[from] ?? from}..${DOW_MAP[to] ?? to} `;
    } else {
      dow = `${DOW_MAP[dayOfWeek] ?? dayOfWeek} `;
    }
  }

  const m = month === "*" ? "*" : month.padStart(2, "0");
  const d = dayOfMonth === "*" ? "*" : dayOfMonth.padStart(2, "0");

  let hStr: string;
  let mStr: string;

  if (minute.startsWith("*/")) {
    mStr = `00/${minute.slice(2)}`;
    hStr = "*";
  } else {
    mStr = minute === "*" ? "*" : minute.padStart(2, "0");
    hStr = hour === "*" ? "*" : hour.padStart(2, "0");
  }

  return `${dow}*-${m}-${d} ${hStr}:${mStr}:00`;
}

// --- Unit file generation ---

export function generateServiceUnit(task: Task, binPath?: string, envPath?: string): string {
  const bin = binPath ?? getBinPath();
  const path = envPath ?? process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin";

  return `[Unit]
Description=reveille task: ${task.name}

[Service]
Type=oneshot
ExecStart=${bin} run ${task.id}
WorkingDirectory=${task.workingDir}
Environment="PATH=${path}"
Environment="HOME=${homedir()}"
`;
}

export function generateTimerUnit(task: Task): string {
  let schedule = "";

  if (task.scheduleType === "interval" && task.scheduleIntervalSeconds) {
    schedule = `OnBootSec=${task.scheduleIntervalSeconds}s\nOnUnitActiveSec=${task.scheduleIntervalSeconds}s`;
  } else if (task.scheduleType === "cron" && task.scheduleCron) {
    schedule = `OnCalendar=${cronToOnCalendar(task.scheduleCron)}`;
  }

  return `[Unit]
Description=reveille timer: ${task.name}

[Timer]
${schedule}
Persistent=true

[Install]
WantedBy=timers.target
`;
}

// --- Systemd paths ---

function getSystemdUserDir(): string {
  return join(homedir(), ".config", "systemd", "user");
}

function getServiceName(taskId: string): string {
  return `reveille-${taskId}`;
}

function getServicePath(taskId: string): string {
  return join(getSystemdUserDir(), `${getServiceName(taskId)}.service`);
}

function getTimerPath(taskId: string): string {
  return join(getSystemdUserDir(), `${getServiceName(taskId)}.timer`);
}

// --- Install / Uninstall ---

export function installSystemdTimer(task: Task): void {
  const dir = getSystemdUserDir();
  mkdirSync(dir, { recursive: true });

  const servicePath = getServicePath(task.id);
  const timerPath = getTimerPath(task.id);

  writeFileSync(servicePath, generateServiceUnit(task), "utf-8");
  writeFileSync(timerPath, generateTimerUnit(task), "utf-8");

  execSync("systemctl --user daemon-reload");
  execSync(`systemctl --user enable --now ${getServiceName(task.id)}.timer`);
}

export function uninstallSystemdTimer(taskId: string): void {
  const name = getServiceName(taskId);
  const servicePath = getServicePath(taskId);
  const timerPath = getTimerPath(taskId);

  try {
    execSync(`systemctl --user disable --now ${name}.timer`, { stdio: "ignore" });
  } catch {
    // Ignore
  }

  if (existsSync(timerPath)) unlinkSync(timerPath);
  if (existsSync(servicePath)) unlinkSync(servicePath);

  try {
    execSync("systemctl --user daemon-reload");
  } catch {
    // Ignore
  }
}

export function isSystemdTimerActive(taskId: string): boolean {
  try {
    const output = execSync(`systemctl --user is-active ${getServiceName(taskId)}.timer`, {
      encoding: "utf-8",
    }).trim();
    return output === "active";
  } catch {
    return false;
  }
}
