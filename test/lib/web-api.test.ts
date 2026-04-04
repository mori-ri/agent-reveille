import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleApiRequest } from "../../src/lib/web-api.js";
import { createTask, listTasks } from "../../src/lib/tasks.js";
import { getTasksFilePath, getExecutionsFilePath } from "../../src/lib/paths.js";
import { writeFileSync, existsSync } from "node:fs";

describe("web-api", () => {
  const tasksPath = getTasksFilePath();
  const execsPath = getExecutionsFilePath();

  beforeEach(() => {
    writeFileSync(tasksPath, "[]", "utf-8");
    writeFileSync(execsPath, "[]", "utf-8");
  });

  afterEach(() => {
    if (existsSync(tasksPath)) writeFileSync(tasksPath, "[]", "utf-8");
    if (existsSync(execsPath)) writeFileSync(execsPath, "[]", "utf-8");
  });

  describe("GET /api/tasks", () => {
    it("should return empty array when no tasks", () => {
      const res = handleApiRequest("GET", "/api/tasks");
      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });

    it("should return all tasks", () => {
      createTask({ name: "A", agent: "custom", command: "echo a", workingDir: "/tmp", scheduleType: "manual" });
      createTask({ name: "B", agent: "custom", command: "echo b", workingDir: "/tmp", scheduleType: "manual" });

      const res = handleApiRequest("GET", "/api/tasks");
      expect(res.status).toBe(200);
      const tasks = JSON.parse(res.body);
      expect(tasks).toHaveLength(2);
    });
  });

  describe("GET /api/executions", () => {
    it("should return empty array when no executions", () => {
      const res = handleApiRequest("GET", "/api/executions");
      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("should return a specific task", () => {
      const task = createTask({ name: "Find me", agent: "custom", command: "echo hi", workingDir: "/tmp", scheduleType: "manual" });

      const res = handleApiRequest("GET", `/api/tasks/${task.id}`);
      expect(res.status).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.name).toBe("Find me");
    });

    it("should return 404 for unknown task", () => {
      const res = handleApiRequest("GET", "/api/tasks/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/tasks/:id/toggle", () => {
    it("should toggle enabled task to disabled", () => {
      const task = createTask({ name: "Toggle", agent: "custom", command: "echo x", workingDir: "/tmp", scheduleType: "cron", scheduleCron: "0 9 * * *" });

      const res = handleApiRequest("POST", `/api/tasks/${task.id}/toggle`);
      expect(res.status).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.enabled).toBe(false);
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete a task", () => {
      const task = createTask({ name: "Delete me", agent: "custom", command: "echo x", workingDir: "/tmp", scheduleType: "manual" });

      const res = handleApiRequest("DELETE", `/api/tasks/${task.id}`);
      expect(res.status).toBe(200);
      expect(listTasks()).toHaveLength(0);
    });

    it("should return 404 for unknown task", () => {
      const res = handleApiRequest("DELETE", "/api/tasks/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/tasks/:id/executions", () => {
    it("should return executions for a task", () => {
      const task = createTask({ name: "Exec test", agent: "custom", command: "echo x", workingDir: "/tmp", scheduleType: "manual" });

      const res = handleApiRequest("GET", `/api/tasks/${task.id}/executions`);
      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });

    it("should return 404 for unknown task", () => {
      const res = handleApiRequest("GET", "/api/tasks/nonexistent/executions");
      expect(res.status).toBe(404);
    });
  });

  describe("query string handling", () => {
    it("should ignore query strings on API paths", () => {
      const res = handleApiRequest("GET", "/api/tasks?foo=bar");
      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });
  });

  describe("unknown routes", () => {
    it("should return 404 for unknown API paths", () => {
      const res = handleApiRequest("GET", "/api/unknown");
      expect(res.status).toBe(404);
    });

    it("should return 404 for invalid task ID characters", () => {
      const res = handleApiRequest("GET", "/api/tasks/../../etc");
      expect(res.status).toBe(404);
    });
  });
});
