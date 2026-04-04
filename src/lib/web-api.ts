import { listTasks, getTask, updateTask, deleteTask, getTaskExecutions, getRecentExecutions } from "./tasks.js";

export interface ApiResponse {
  status: number;
  body: string;
  contentType?: string;
}

function json(data: unknown, status = 200): ApiResponse {
  return { status, body: JSON.stringify(data), contentType: "application/json" };
}

function notFound(message = "Not found"): ApiResponse {
  return json({ error: message }, 404);
}

export function handleApiRequest(method: string, path: string): ApiResponse {
  // GET /api/tasks
  if (method === "GET" && path === "/api/tasks") {
    return json(listTasks());
  }

  // GET /api/executions
  if (method === "GET" && path === "/api/executions") {
    return json(getRecentExecutions(50));
  }

  // GET /api/tasks/:id
  const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
  if (method === "GET" && taskMatch) {
    const task = getTask(taskMatch[1]);
    if (!task) return notFound("Task not found");
    return json(task);
  }

  // POST /api/tasks/:id/toggle
  const toggleMatch = path.match(/^\/api\/tasks\/([^/]+)\/toggle$/);
  if (method === "POST" && toggleMatch) {
    const task = getTask(toggleMatch[1]);
    if (!task) return notFound("Task not found");
    const updated = updateTask(task.id, { enabled: !task.enabled });
    return json(updated);
  }

  // GET /api/tasks/:id/executions
  const execMatch = path.match(/^\/api\/tasks\/([^/]+)\/executions$/);
  if (method === "GET" && execMatch) {
    const task = getTask(execMatch[1]);
    if (!task) return notFound("Task not found");
    return json(getTaskExecutions(task.id, 20));
  }

  // DELETE /api/tasks/:id
  const deleteMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
  if (method === "DELETE" && deleteMatch) {
    const task = getTask(deleteMatch[1]);
    if (!task) return notFound("Task not found");
    deleteTask(task.id);
    return json({ ok: true });
  }

  return notFound("Unknown API endpoint");
}
