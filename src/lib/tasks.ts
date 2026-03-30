import { loadTasks, saveTasks, loadExecutions, saveExecutions } from "./db.js";
import { generateId } from "../utils/id.js";
import type { Task, CreateTaskInput, Execution } from "./schema.js";

export function createTask(input: CreateTaskInput): Task {
  const now = new Date().toISOString();
  const task: Task = {
    id: generateId(),
    ...input,
    enabled: input.scheduleType !== "manual",
    createdAt: now,
    updatedAt: now,
  };
  const tasks = loadTasks();
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

export function getTask(id: string): Task | null {
  const tasks = loadTasks();
  return tasks.find((t) => t.id === id) ?? null;
}

export function listTasks(): Task[] {
  return loadTasks();
}

export function updateTask(id: string, updates: Partial<Omit<Task, "id" | "createdAt">>): Task {
  const tasks = loadTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) throw new Error(`Task not found: ${id}`);
  tasks[index] = {
    ...tasks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveTasks(tasks);
  return tasks[index];
}

export function deleteTask(id: string): void {
  const tasks = loadTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) throw new Error(`Task not found: ${id}`);
  saveTasks(filtered);

  // Also clean up executions for this task
  const executions = loadExecutions();
  saveExecutions(executions.filter((e) => e.taskId !== id));
}

export function getTaskExecutions(taskId: string, limit = 20): Execution[] {
  const executions = loadExecutions();
  return executions
    .filter((e) => e.taskId === taskId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);
}

export function getRecentExecutions(limit = 20): Execution[] {
  const executions = loadExecutions();
  return executions
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);
}
