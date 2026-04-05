import { spawn } from "node:child_process";
import { createWriteStream, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadTaskExecutions, saveTaskExecutions } from "./db.js";
import { getTask } from "./tasks.js";
import { getLogDir } from "./paths.js";
import { generateId } from "../utils/id.js";
import { buildCommand } from "./agents.js";
import type { Execution } from "./schema.js";

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function executeTask(taskId: string): Promise<Execution> {
  const task = getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const executionId = generateId();
  const logDir = getLogDir(taskId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const stdoutPath = join(logDir, `${timestamp}.stdout.log`);
  const stderrPath = join(logDir, `${timestamp}.stderr.log`);

  const execution: Execution = {
    id: executionId,
    taskId,
    startedAt: new Date().toISOString(),
    stdoutPath,
    stderrPath,
    status: "running",
  };

  // Save initial execution record
  const executions = loadTaskExecutions(taskId);
  executions.push(execution);
  saveTaskExecutions(taskId, executions);

  return new Promise((resolve) => {
    const stdoutStream = createWriteStream(stdoutPath);
    const stderrStream = createWriteStream(stderrPath);
    let stdoutBuffer = "";

    const executableCommand = task.agent === "custom"
      ? task.command
      : buildCommand(task.agent, task.command, undefined, task.model);

    const proc = spawn("sh", ["-c", executableCommand], {
      cwd: task.workingDir,
      env: {
        ...process.env,
        HOME: process.env.HOME,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      setTimeout(() => {
        if (!proc.killed) proc.kill("SIGKILL");
      }, 5000);
    }, DEFAULT_TIMEOUT_MS);

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdoutStream.write(data);
      stdoutBuffer += text;
      // Keep only last 500 chars for preview
      if (stdoutBuffer.length > 500) {
        stdoutBuffer = stdoutBuffer.slice(-500);
      }
      // Also pass through to console when running interactively
      if (process.stdout.isTTY) {
        process.stdout.write(data);
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderrStream.write(data);
      if (process.stderr.isTTY) {
        process.stderr.write(data);
      }
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      stdoutStream.end();
      stderrStream.end();

      const finishedExecution: Execution = {
        ...execution,
        finishedAt: new Date().toISOString(),
        exitCode: code ?? -1,
        stdoutTail: stdoutBuffer.trim(),
        status: code === 0 ? "success" : code === null ? "timeout" : "failed",
      };

      // Update execution record
      const allExecutions = loadTaskExecutions(taskId);
      const index = allExecutions.findIndex((e) => e.id === executionId);
      if (index !== -1) {
        allExecutions[index] = finishedExecution;
      }
      saveTaskExecutions(taskId, allExecutions);

      resolve(finishedExecution);
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      stdoutStream.end();
      stderrStream.end();

      const failedExecution: Execution = {
        ...execution,
        finishedAt: new Date().toISOString(),
        exitCode: -1,
        stdoutTail: `Error: ${err.message}`,
        status: "failed",
      };

      const allExecutions = loadTaskExecutions(taskId);
      const index = allExecutions.findIndex((e) => e.id === executionId);
      if (index !== -1) {
        allExecutions[index] = failedExecution;
      }
      saveTaskExecutions(taskId, allExecutions);

      resolve(failedExecution);
    });
  });
}

export function readLogFile(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "(log file not found)";
  }
}
