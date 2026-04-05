import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import matter from "gray-matter";
import {
  getExecutionsDir,
  getExecutionsFilePath,
  getTaskExecutionsFilePath,
  getTaskFilePath,
  getTasksDir,
  getTasksFilePath,
} from "./paths.js";
import { TaskSchema } from "./schema.js";
import type { Execution, Task } from "./schema.js";

// --- Task serialization ---

function serializeTask(task: Task): string {
  const { id, command, ...meta } = task;
  // Strip undefined values — js-yaml cannot serialize them
  const cleaned = Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined));
  return matter.stringify(command, cleaned);
}

function deserializeTask(id: string, fileContent: string): Task | null {
  try {
    const { data, content } = matter(fileContent);
    const result = TaskSchema.safeParse({ ...data, id, command: content.trim() });
    if (!result.success) {
      console.warn(`Invalid task file ${id}.md: ${result.error.message}`);
      return null;
    }
    return result.data;
  } catch (err) {
    console.warn(`Failed to parse task file ${id}.md: ${err}`);
    return null;
  }
}

// --- Task I/O ---

export function loadTask(id: string): Task | null {
  migrateIfNeeded();
  const filePath = getTaskFilePath(id);
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, "utf-8");
  return deserializeTask(id, content);
}

export function loadTasks(): Task[] {
  migrateIfNeeded();
  const dir = getTasksDir();
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const tasks: Task[] = [];
  for (const file of files) {
    const id = file.replace(/\.md$/, "");
    const task = loadTask(id);
    if (task) tasks.push(task);
  }
  tasks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return tasks;
}

export function saveTask(task: Task): void {
  const filePath = getTaskFilePath(task.id);
  const tmpPath = `${filePath}.tmp`;
  writeFileSync(tmpPath, serializeTask(task), "utf-8");
  renameSync(tmpPath, filePath);
}

export function deleteTaskFile(id: string): void {
  const filePath = getTaskFilePath(id);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

// --- Execution I/O (per-task JSON) ---

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  const tmpPath = `${filePath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmpPath, filePath);
}

export function loadTaskExecutions(taskId: string): Execution[] {
  return readJson<Execution[]>(getTaskExecutionsFilePath(taskId), []);
}

export function saveTaskExecutions(taskId: string, executions: Execution[]): void {
  writeJson(getTaskExecutionsFilePath(taskId), executions);
}

export function loadAllExecutions(): Execution[] {
  const dir = getExecutionsDir();
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const all: Execution[] = [];
  for (const file of files) {
    const taskId = file.replace(/\.json$/, "");
    const execs = loadTaskExecutions(taskId);
    all.push(...execs);
  }
  return all;
}

export function deleteTaskExecutions(taskId: string): void {
  const filePath = getTaskExecutionsFilePath(taskId);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

// --- Migration from old format ---

let migrationChecked = false;

/** Reset migration state. Exported for testing only. */
export function resetMigrationState(): void {
  migrationChecked = false;
}

const AGENT_COMMAND_PATTERNS: Record<string, RegExp> = {
  claude: /^claude\s+-p\s+("(?:[^"\\]|\\.)*")\s*/,
  codex: /^codex\s+-q\s+("(?:[^"\\]|\\.)*")\s*/,
  gemini: /^gemini\s+-p\s+("(?:[^"\\]|\\.)*")\s*/,
  aider: /^aider\s+--message\s+("(?:[^"\\]|\\.)*")\s*/,
};

function extractPromptFromCommand(agent: string, command: string): string {
  const pattern = AGENT_COMMAND_PATTERNS[agent];
  if (!pattern) return command;

  const match = command.match(pattern);
  if (!match) return command;

  try {
    return JSON.parse(match[1]);
  } catch {
    return command;
  }
}

export function migrateIfNeeded(): void {
  if (migrationChecked) return;
  migrationChecked = true;

  const oldTasksPath = getTasksFilePath();
  if (!existsSync(oldTasksPath)) return;

  // Check if tasks dir already has files (already migrated)
  const tasksDir = getTasksDir();
  const existing = readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
  if (existing.length > 0) return;

  // Migrate tasks
  const oldTasks = readJson<Task[]>(oldTasksPath, []);
  for (const task of oldTasks) {
    const prompt = extractPromptFromCommand(task.agent, task.command);
    saveTask({ ...task, command: prompt });
  }

  // Migrate executions
  const oldExecsPath = getExecutionsFilePath();
  if (existsSync(oldExecsPath)) {
    const oldExecs = readJson<Execution[]>(oldExecsPath, []);
    const grouped = new Map<string, Execution[]>();
    for (const exec of oldExecs) {
      const list = grouped.get(exec.taskId) ?? [];
      list.push(exec);
      grouped.set(exec.taskId, list);
    }
    for (const [taskId, execs] of grouped) {
      saveTaskExecutions(taskId, execs);
    }
    renameSync(oldExecsPath, `${oldExecsPath}.bak`);
  }

  // Rename old tasks file
  renameSync(oldTasksPath, `${oldTasksPath}.bak`);
}
