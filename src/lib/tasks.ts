import { generateId } from "../utils/id.js";
import {
  deleteTaskExecutions,
  deleteTaskFile,
  loadAllExecutions,
  loadTasks as loadAllTasks,
  loadTaskExecutions as loadExecs,
  loadTask,
  saveTask,
} from "./db.js";
import type { CreateTaskInput, Execution, Task } from "./schema.js";

export function createTask(input: CreateTaskInput): Task {
  const now = new Date().toISOString();
  const task: Task = {
    id: generateId(),
    ...input,
    enabled: input.scheduleType !== "manual",
    createdAt: now,
    updatedAt: now,
  };
  saveTask(task);
  return task;
}

export function getTask(id: string): Task | null {
  return loadTask(id);
}

export function listTasks(): Task[] {
  return loadAllTasks();
}

export function updateTask(id: string, updates: Partial<Omit<Task, "id" | "createdAt">>): Task {
  const task = loadTask(id);
  if (!task) throw new Error(`Task not found: ${id}`);
  const updated: Task = {
    ...task,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveTask(updated);
  return updated;
}

export function deleteTask(id: string): void {
  const task = loadTask(id);
  if (!task) throw new Error(`Task not found: ${id}`);
  deleteTaskFile(id);
  deleteTaskExecutions(id);
}

export function getTaskExecutions(taskId: string, limit = 20): Execution[] {
  const executions = loadExecs(taskId);
  return executions
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);
}

export function getRecentExecutions(limit = 20): Execution[] {
  const executions = loadAllExecutions();
  return executions
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);
}
