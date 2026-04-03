import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { getTasksFilePath, getExecutionsFilePath } from "./paths.js";
import type { Task, Execution } from "./schema.js";

interface Database {
  tasks: Task[];
  executions: Execution[];
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  const tmpPath = filePath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmpPath, filePath);
}

export function loadTasks(): Task[] {
  return readJson<Task[]>(getTasksFilePath(), []);
}

export function saveTasks(tasks: Task[]): void {
  writeJson(getTasksFilePath(), tasks);
}

export function loadExecutions(): Execution[] {
  return readJson<Execution[]>(getExecutionsFilePath(), []);
}

export function saveExecutions(executions: Execution[]): void {
  writeJson(getExecutionsFilePath(), executions);
}

export function getDb(): Database {
  return {
    tasks: loadTasks(),
    executions: loadExecutions(),
  };
}
