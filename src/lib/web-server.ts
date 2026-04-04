import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleApiRequest } from "./web-api.js";

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>reveille dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; background: #1a1a2e; color: #e0e0e0; padding: 20px; }
  h1 { color: #f0c040; margin-bottom: 4px; font-size: 1.4rem; }
  .subtitle { color: #888; margin-bottom: 20px; font-size: 0.85rem; }
  .card { background: #16213e; border-radius: 8px; padding: 16px; margin-bottom: 12px; border: 1px solid #1a1a3e; }
  .card:hover { border-color: #f0c040; }
  .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .task-name { font-weight: bold; font-size: 1.1rem; }
  .badge { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
  .badge.active { background: #2ecc71; color: #000; }
  .badge.paused { background: #555; color: #ccc; }
  .badge.manual { background: #3498db; color: #fff; }
  .badge.success { background: #2ecc71; color: #000; }
  .badge.failed { background: #e74c3c; color: #fff; }
  .badge.running { background: #f39c12; color: #000; }
  .meta { color: #888; font-size: 0.85rem; }
  .meta span { margin-right: 16px; }
  .actions { margin-top: 8px; }
  .btn { padding: 4px 12px; border: 1px solid #555; border-radius: 4px; background: #1a1a2e; color: #e0e0e0; cursor: pointer; font-size: 0.8rem; margin-right: 6px; }
  .btn:hover { border-color: #f0c040; color: #f0c040; }
  .btn.danger:hover { border-color: #e74c3c; color: #e74c3c; }
  .empty { text-align: center; padding: 40px; color: #666; }
  .exec-list { margin-top: 8px; }
  .exec-item { font-size: 0.8rem; color: #888; padding: 2px 0; }
  #refresh { color: #666; font-size: 0.75rem; position: fixed; top: 10px; right: 20px; }
</style>
</head>
<body>
<h1>reveille</h1>
<p class="subtitle">AI Agent Task Scheduler</p>
<div id="refresh">Auto-refresh: 5s</div>
<div id="tasks"></div>

<script>
async function fetchTasks() {
  const res = await fetch('/api/tasks');
  return res.json();
}

async function fetchExecutions() {
  const res = await fetch('/api/executions');
  return res.json();
}

async function toggleTask(id) {
  await fetch('/api/tasks/' + id + '/toggle', { method: 'POST' });
  render();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await fetch('/api/tasks/' + id, { method: 'DELETE' });
  render();
}

function timeAgo(date) {
  if (!date) return 'never';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

async function render() {
  const [tasks, executions] = await Promise.all([fetchTasks(), fetchExecutions()]);
  const el = document.getElementById('tasks');

  if (tasks.length === 0) {
    el.innerHTML = '<div class="empty">No tasks. Create one with: reveille add</div>';
    return;
  }

  const execByTask = {};
  for (const e of executions) {
    if (!execByTask[e.taskId]) execByTask[e.taskId] = [];
    execByTask[e.taskId].push(e);
  }

  el.innerHTML = tasks.map(t => {
    const status = t.scheduleType === 'manual' ? 'manual' : t.enabled ? 'active' : 'paused';
    const execs = (execByTask[t.id] || []).slice(0, 3);
    const lastExec = execs[0];

    return '<div class="card">' +
      '<div class="task-header">' +
        '<span class="task-name">' + esc(t.name) + '</span>' +
        '<span class="badge ' + status + '">' + status + '</span>' +
      '</div>' +
      '<div class="meta">' +
        '<span>ID: ' + esc(t.id) + '</span>' +
        '<span>Agent: ' + esc(t.agent) + '</span>' +
        '<span>Dir: ' + esc(t.workingDir) + '</span>' +
        '<span>Schedule: ' + esc(t.scheduleCron || t.scheduleType) + '</span>' +
        (lastExec ? '<span>Last: <span class="badge ' + lastExec.status + '">' + esc(lastExec.status) + '</span> ' + timeAgo(lastExec.finishedAt) + '</span>' : '') +
      '</div>' +
      '<div class="actions">' +
        (t.scheduleType !== 'manual' ? '<button class="btn" onclick="toggleTask(\\''+esc(t.id)+'\\')">'+( t.enabled ? 'Disable' : 'Enable')+'</button>' : '') +
        '<button class="btn danger" onclick="deleteTask(\\''+esc(t.id)+'\\')">Delete</button>' +
      '</div>' +
      (execs.length > 0 ? '<div class="exec-list">' + execs.map(e =>
        '<div class="exec-item"><span class="badge '+esc(e.status)+'">'+esc(e.status)+'</span> '+timeAgo(e.finishedAt)+(e.stdoutTail ? ' — '+esc(e.stdoutTail.slice(0,80)) : '')+'</div>'
      ).join('') + '</div>' : '') +
    '</div>';
  }).join('');
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

render();
setInterval(render, 5000);
</script>
</body>
</html>`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function startWebServer(port: number): ReturnType<typeof createServer> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = (req.url ?? "/").split("?")[0];
    const method = req.method ?? "GET";

    // Serve dashboard HTML
    if (url === "/" || url === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(DASHBOARD_HTML);
      return;
    }

    // CORS preflight
    if (method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    // API routes
    if (url.startsWith("/api/")) {
      const apiRes = handleApiRequest(method, url);
      res.writeHead(apiRes.status, {
        "Content-Type": apiRes.contentType ?? "application/json",
        ...CORS_HEADERS,
      });
      res.end(apiRes.body);
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  server.listen(port);
  return server;
}
