import { execSync as nodeExecSync } from "node:child_process";
import { existsSync as nodeExistsSync, readFileSync as nodeReadFileSync, readdirSync as nodeReaddirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AGENTS } from "./agents.js";
import { getBinPath as getRevBinPath } from "./paths.js";
import type { Task } from "./schema.js";

// --- Types ---

export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  detail?: string;
}

export interface DiagnosticCategory {
  category: string;
  results: CheckResult[];
}

export interface SystemEnv {
  which(binary: string): string | null;
  existsSync(path: string): boolean;
  readFileSync(path: string): string | null;
  readdirSync(path: string): string[];
  execSync(cmd: string): string | null;
  getLoginShellPath(): string;
  getCurrentPath(): string;
  getHomedir(): string;
  getBinPath(): string;
}

// --- Default SystemEnv ---

export function createSystemEnv(): SystemEnv {
  return {
    which(binary: string): string | null {
      try {
        return nodeExecSync(`which ${binary}`, { encoding: "utf-8", timeout: 5000 }).trim() || null;
      } catch {
        return null;
      }
    },
    existsSync: nodeExistsSync,
    readFileSync(path: string): string | null {
      try {
        return nodeReadFileSync(path, "utf-8");
      } catch {
        return null;
      }
    },
    readdirSync(path: string): string[] {
      try {
        return nodeReaddirSync(path);
      } catch {
        return [];
      }
    },
    execSync(cmd: string): string | null {
      try {
        return nodeExecSync(cmd, { encoding: "utf-8", timeout: 5000 }).trim();
      } catch {
        return null;
      }
    },
    getLoginShellPath(): string {
      try {
        const shell = process.env.SHELL ?? "/bin/zsh";
        return nodeExecSync(`${shell} -l -c 'echo $PATH'`, { encoding: "utf-8", timeout: 5000 }).trim();
      } catch {
        return process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin";
      }
    },
    getCurrentPath: () => process.env.PATH ?? "/usr/bin:/bin",
    getHomedir: () => homedir(),
    getBinPath: () => getRevBinPath(),
  };
}

// --- Check Functions ---

export function checkAgentBinaries(env: SystemEnv): DiagnosticCategory {
  const results: CheckResult[] = [];

  for (const agent of Object.values(AGENTS)) {
    const path = env.which(agent.binary);
    if (path) {
      results.push({
        name: agent.id,
        status: "pass",
        message: `${agent.name} found at ${path}`,
      });
    } else {
      results.push({
        name: agent.id,
        status: "warn",
        message: `${agent.name} (${agent.binary}) not found on PATH`,
        detail: `Install ${agent.name} or ensure its binary is in your PATH`,
      });
    }
  }

  return { category: "Agent Binaries", results };
}

export function checkPathConfig(env: SystemEnv): DiagnosticCategory {
  const results: CheckResult[] = [];
  const currentDirs = new Set(env.getCurrentPath().split(":"));
  const loginDirs = new Set(env.getLoginShellPath().split(":"));

  const missingDirs = [...currentDirs].filter((d) => d && !loginDirs.has(d));

  if (missingDirs.length === 0) {
    results.push({
      name: "path-match",
      status: "pass",
      message: "Login shell PATH includes all current PATH directories",
    });
  } else {
    for (const dir of missingDirs) {
      results.push({
        name: "path-missing",
        status: "warn",
        message: `${dir} is in current PATH but missing from login shell PATH`,
        detail: "launchd tasks inherit the login shell PATH. Binaries in this directory may not be found by scheduled tasks.",
      });
    }
  }

  return { category: "PATH Configuration", results };
}

export function checkLaunchAgentsDir(env: SystemEnv): DiagnosticCategory {
  const dir = join(env.getHomedir(), "Library", "LaunchAgents");
  const exists = env.existsSync(dir);

  return {
    category: "LaunchAgents Directory",
    results: [
      exists
        ? { name: "launchagents-dir", status: "pass" as const, message: `${dir} exists` }
        : { name: "launchagents-dir", status: "fail" as const, message: `${dir} not found`, detail: `Create it with: mkdir -p ${dir}` },
    ],
  };
}

export function checkPlistIntegrity(env: SystemEnv, tasks: Task[]): DiagnosticCategory {
  const results: CheckResult[] = [];
  const plistDir = join(env.getHomedir(), "Library", "LaunchAgents");
  const enabledTasks = tasks.filter((t) => t.enabled);

  for (const task of enabledTasks) {
    const plistPath = join(plistDir, `com.reveille.task.${task.id}.plist`);
    if (env.existsSync(plistPath)) {
      results.push({
        name: task.id,
        status: "pass",
        message: `Plist exists for "${task.name}" (${task.id})`,
      });
    } else {
      results.push({
        name: task.id,
        status: "fail",
        message: `Plist missing for enabled task "${task.name}" (${task.id})`,
        detail: `Fix: run \`reveille enable ${task.id}\` to regenerate`,
      });
    }
  }

  // Check for orphan plists
  const allFiles = env.readdirSync(plistDir);
  const reveilleFiles = allFiles.filter((f) => f.startsWith("com.reveille.task.") && f.endsWith(".plist"));
  const taskIds = new Set(tasks.map((t) => t.id));

  for (const file of reveilleFiles) {
    const match = file.match(/^com\.reveille\.task\.(.+)\.plist$/);
    if (match && !taskIds.has(match[1])) {
      results.push({
        name: match[1],
        status: "warn",
        message: `Orphan plist found: ${file} (no matching task)`,
        detail: `Remove with: rm ~/Library/LaunchAgents/${file}`,
      });
    }
  }

  return { category: "Plist Integrity", results };
}

export function checkLaunchdState(env: SystemEnv, tasks: Task[]): DiagnosticCategory {
  const results: CheckResult[] = [];

  for (const task of tasks) {
    const label = `com.reveille.task.${task.id}`;
    const loaded = env.execSync(`launchctl list ${label}`) !== null;

    if (task.enabled && loaded) {
      results.push({
        name: task.id,
        status: "pass",
        message: `"${task.name}" (${task.id}) is enabled and loaded`,
      });
    } else if (task.enabled && !loaded) {
      results.push({
        name: task.id,
        status: "fail",
        message: `"${task.name}" (${task.id}) is enabled but not loaded in launchctl`,
        detail: `Fix: run \`reveille enable ${task.id}\` to reload`,
      });
    } else if (!task.enabled && loaded) {
      results.push({
        name: task.id,
        status: "warn",
        message: `"${task.name}" (${task.id}) is disabled but still loaded in launchctl`,
        detail: `Fix: run \`reveille disable ${task.id}\` to unload`,
      });
    }
    // disabled + not loaded = expected, no output needed
  }

  return { category: "Launchd State", results };
}

export function checkConfiguration(env: SystemEnv): DiagnosticCategory {
  const results: CheckResult[] = [];
  const configDir = join(env.getHomedir(), ".config", "reveille");

  for (const file of ["tasks.json", "executions.json"]) {
    const path = join(configDir, file);
    if (!env.existsSync(path)) {
      results.push({
        name: file,
        status: "warn",
        message: `${file} does not exist yet`,
        detail: "This file will be created automatically when you add your first task",
      });
      continue;
    }

    const content = env.readFileSync(path);
    if (content === null) {
      results.push({
        name: file,
        status: "fail",
        message: `${file} could not be read`,
      });
      continue;
    }

    try {
      JSON.parse(content);
      results.push({
        name: file,
        status: "pass",
        message: `${file} is valid JSON`,
      });
    } catch {
      results.push({
        name: file,
        status: "fail",
        message: `${file} contains invalid JSON`,
        detail: `Check the file at ${path}`,
      });
    }
  }

  return { category: "Configuration", results };
}

export function checkBinPath(env: SystemEnv): DiagnosticCategory {
  const binPath = env.getBinPath();
  const isDev = binPath.includes("tsx") || binPath.includes("ts-node");

  if (isDev) {
    return {
      category: "Binary Path",
      results: [
        {
          name: "bin-path",
          status: "warn",
          message: `Running in dev mode (${binPath})`,
          detail: "Scheduled tasks may reference a different binary path. Run `npm run build` for production use.",
        },
      ],
    };
  }

  const exists = env.existsSync(binPath);
  return {
    category: "Binary Path",
    results: [
      exists
        ? { name: "bin-path", status: "pass" as const, message: `reveille binary found at ${binPath}` }
        : { name: "bin-path", status: "fail" as const, message: `reveille binary not found at ${binPath}` },
    ],
  };
}

// --- Orchestrator ---

export function runAllChecks(env?: SystemEnv, tasks?: Task[]): DiagnosticCategory[] {
  const e = env ?? createSystemEnv();
  const t = tasks ?? [];

  return [
    checkAgentBinaries(e),
    checkPathConfig(e),
    checkLaunchAgentsDir(e),
    checkPlistIntegrity(e, t),
    checkLaunchdState(e, t),
    checkConfiguration(e),
    checkBinPath(e),
  ];
}
