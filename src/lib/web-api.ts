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

export function handleApiRequest(method: string, rawPath: string): ApiResponse {
  // Strip query string
  const path = rawPath.split("?")[0];

  // GET /api/tasks
  if (method === "GET" && path === "/api/tasks") {
    return json(listTasks());
  }

  // GET /api/executions
  if (method === "GET" && path === "/api/executions") {
    return json(getRecentExecutions(50));
  }

  // Routes under /api/tasks/:id
  const taskRouteMatch = path.match(/^\/api\/tasks\/([A-Za-z0-9_-]+)(\/.*)?$/);
  if (!taskRouteMatch) {
    return notFound("Unknown API endpoint");
  }

  const taskId = taskRouteMatch[1];
  const subPath = taskRouteMatch[2] ?? "";
  const task = getTask(taskId);
  if (!task) return notFound("Task not found");

  // GET /api/tasks/:id
  if (method === "GET" && subPath === "") {
    return json(task);
  }

  // DELETE /api/tasks/:id
  if (method === "DELETE" && subPath === "") {
    deleteTask(task.id);
    return json({ ok: true });
  }

  // POST /api/tasks/:id/toggle
  if (method === "POST" && subPath === "/toggle") {
    const updated = updateTask(task.id, { enabled: !task.enabled });
    return json(updated);
  }

  // GET /api/tasks/:id/executions
  if (method === "GET" && subPath === "/executions") {
    return json(getTaskExecutions(task.id, 20));
  }

  return notFound("Unknown API endpoint");
}
