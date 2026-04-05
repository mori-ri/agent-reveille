import { execSync } from "node:child_process";
import { constants, accessSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { detectInstalledAgents, getAgent } from "./agents.js";
import { getBinPath, getConfigDir, getDataDir, getPlistDir, getPlistPath } from "./paths.js";
import { getUserPath, isLoaded } from "./scheduler.js";
import type { AgentId, Task } from "./schema.js";
import { listTasks } from "./tasks.js";

export type CheckStatus = "pass" | "fail" | "warn";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  detail?: string;
}

export interface DiagnosticReport {
  checks: CheckResult[];
  hasFail: boolean;
  hasWarn: boolean;
}

function checkReveilleBinary(): CheckResult {
  const binPath = getBinPath();
  if (binPath && existsSync(binPath)) {
    return {
      name: "reveille-binary",
      status: "pass",
      message: `reveille binary found at ${binPath}`,
    };
  }

  // Try which as fallback
  try {
    const resolved = execSync("which reveille", {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    if (resolved) {
      return {
        name: "reveille-binary",
        status: "pass",
        message: `reveille binary found at ${resolved}`,
      };
    }
  } catch {
    // not found
  }

  return {
    name: "reveille-binary",
    status: "fail",
    message: "reveille binary not found",
    detail: "launchd plists will fail to execute without the reveille binary on PATH",
  };
}

function checkAgentBinaries(): CheckResult[] {
  const agents = detectInstalledAgents();
  return agents.map((agent) => ({
    name: `agent-${agent.id}`,
    status: agent.installed ? "pass" : "warn",
    message: agent.installed
      ? `${agent.name} (${agent.binary}) found`
      : `${agent.name} (${agent.binary}) not found`,
  }));
}

function checkPathConfiguration(): CheckResult {
  const path = getUserPath();
  const home = homedir();
  const expectedDirs = ["/usr/local/bin", "/opt/homebrew/bin", `${home}/.local/bin`];

  const pathDirs = path.split(":");
  const missing = expectedDirs.filter((dir) => !pathDirs.includes(dir));

  if (missing.length === 0) {
    return {
      name: "path-config",
      status: "pass",
      message: "Login shell PATH includes standard locations",
    };
  }

  return {
    name: "path-config",
    status: "warn",
    message: "Login shell PATH missing some standard locations",
    detail: `Missing: ${missing.join(", ")}`,
  };
}

function checkDirectory(name: string, dirPath: string): CheckResult {
  const displayPath = dirPath.replace(homedir(), "~");

  if (!existsSync(dirPath)) {
    return {
      name: `dir-${name}`,
      status: "fail",
      message: `${name} directory missing (${displayPath})`,
    };
  }

  try {
    accessSync(dirPath, constants.W_OK);
    return {
      name: `dir-${name}`,
      status: "pass",
      message: `${name} directory writable (${displayPath})`,
    };
  } catch {
    return {
      name: `dir-${name}`,
      status: "fail",
      message: `${name} directory not writable (${displayPath})`,
      detail: "Check file permissions",
    };
  }
}

function checkDirectories(): CheckResult[] {
  return [
    checkDirectory("Config", getConfigDir()),
    checkDirectory("Data", getDataDir()),
    checkDirectory("LaunchAgents", getPlistDir()),
  ];
}

function checkLaunchctlConnectivity(): CheckResult {
  if (process.env.REVEILLE_SKIP_LAUNCHCTL) {
    return {
      name: "launchctl",
      status: "pass",
      message: "launchctl check skipped (test environment)",
    };
  }

  try {
    execSync("launchctl list", { stdio: "ignore", timeout: 5000 });
    return {
      name: "launchctl",
      status: "pass",
      message: "launchctl is responsive",
    };
  } catch {
    return {
      name: "launchctl",
      status: "fail",
      message: "launchctl is not responding",
      detail: "macOS launchd may be misconfigured",
    };
  }
}

/** Build a lookup of agent binary availability, keyed by AgentId. Runs `which` once per agent. */
function buildAgentInstalledMap(): Map<AgentId, boolean> {
  const agents = detectInstalledAgents();
  return new Map(agents.map((a) => [a.id, a.installed]));
}

function checkTaskWorkdir(task: Task): CheckResult {
  const exists = existsSync(task.workingDir);
  return {
    name: `task-${task.id}-workdir`,
    status: exists ? "pass" : "fail",
    message: `[${task.name}] Working directory ${exists ? "exists" : "missing"}`,
    detail: task.workingDir,
  };
}

function checkTaskPlist(task: Task): CheckResult {
  const plistPath = getPlistPath(task.id);
  const exists = existsSync(plistPath);
  return {
    name: `task-${task.id}-plist`,
    status: exists ? "pass" : "fail",
    message: `[${task.name}] Plist file ${exists ? "present" : "missing"}`,
    detail: exists
      ? undefined
      : `Task is enabled but plist not found — run: reveille enable ${task.id}`,
  };
}

function checkTaskLoaded(task: Task): CheckResult {
  const loaded = isLoaded(task.id);
  return {
    name: `task-${task.id}-loaded`,
    status: loaded ? "pass" : "warn",
    message: `[${task.name}] Plist ${loaded ? "loaded in" : "not loaded in"} launchd`,
    detail: loaded ? undefined : `May need to re-enable after reboot: reveille enable ${task.id}`,
  };
}

function checkTaskAgent(task: Task, agentInstalledMap: Map<AgentId, boolean>): CheckResult | null {
  if (task.agent === "custom") return null;

  const agent = getAgent(task.agent);
  if (!agent) return null;

  const installed = agentInstalledMap.get(task.agent) ?? false;
  return {
    name: `task-${task.id}-agent`,
    status: installed ? "pass" : "warn",
    message: `[${task.name}] Agent binary ${installed ? "available" : "not found"} (${agent.binary})`,
  };
}

function checkTaskHealth(tasks: Task[]): CheckResult[] {
  const agentInstalledMap = buildAgentInstalledMap();
  const results: CheckResult[] = [];

  for (const task of tasks) {
    results.push(checkTaskWorkdir(task));

    if (task.enabled && task.scheduleType !== "manual") {
      results.push(checkTaskPlist(task));
      results.push(checkTaskLoaded(task));
    }

    const agentCheck = checkTaskAgent(task, agentInstalledMap);
    if (agentCheck) {
      results.push(agentCheck);
    }
  }

  return results;
}

export function runDiagnostics(): DiagnosticReport {
  const checks: CheckResult[] = [];

  checks.push(checkReveilleBinary());
  checks.push(...checkAgentBinaries());
  checks.push(checkPathConfiguration());
  checks.push(...checkDirectories());
  checks.push(checkLaunchctlConnectivity());

  const tasks = listTasks();
  if (tasks.length > 0) {
    checks.push(...checkTaskHealth(tasks));
  }

  return {
    checks,
    hasFail: checks.some((c) => c.status === "fail"),
    hasWarn: checks.some((c) => c.status === "warn"),
  };
}
