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

function validateAfterTask(taskId: string, afterTaskId: string): void {
  const upstream = loadTask(afterTaskId);
  if (!upstream) throw new Error(`afterTask not found: ${afterTaskId}`);

  if (taskId === afterTaskId) throw new Error("A task cannot depend on itself");

  // Walk the chain to detect cycles
  const visited = new Set<string>([taskId]);
  let current: Task | null = upstream;
  while (current?.afterTask) {
    if (visited.has(current.afterTask)) {
      throw new Error(`Circular dependency detected: ${current.id} → ${current.afterTask}`);
    }
    visited.add(current.id);
    current = loadTask(current.afterTask);
  }
}

export function getDependentTasks(taskId: string): Task[] {
  return loadAllTasks().filter((t) => t.afterTask === taskId);
}

export function createTask(input: CreateTaskInput): Task {
  const id = generateId();
  const afterTask = input.afterTask || undefined;
  if (afterTask) {
    validateAfterTask(id, afterTask);
  }
  const now = new Date().toISOString();
  const task: Task = {
    id,
    ...input,
    afterTask,
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
  const afterTask = "afterTask" in updates ? updates.afterTask || undefined : undefined;
  if (afterTask) {
    validateAfterTask(id, afterTask);
  }
  const updated: Task = {
    ...task,
    ...updates,
    ...("afterTask" in updates ? { afterTask } : {}),
    updatedAt: new Date().toISOString(),
  };
  saveTask(updated);
  return updated;
}

export function deleteTask(id: string): void {
  const task = loadTask(id);
  if (!task) throw new Error(`Task not found: ${id}`);

  // Clear afterTask references in dependent tasks
  for (const dep of getDependentTasks(id)) {
    saveTask({ ...dep, afterTask: undefined, updatedAt: new Date().toISOString() });
  }

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
