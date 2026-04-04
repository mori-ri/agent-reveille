import { getTask, updateTask } from "../lib/tasks.js";
import { getScheduler, detectPlatform } from "../lib/platform.js";

export default async function enable(args: string[]) {
  const id = args[0];
  if (!id) {
    console.error("Usage: reveille enable <task-id>");
    process.exit(1);
  }

  const task = getTask(id);
  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }

  const scheduler = getScheduler();
  scheduler.install(task);
  updateTask(id, { enabled: true });
  const backend = detectPlatform() === "linux" ? "systemd timer" : "launchd plist";
  console.log(`✓ Enabled: ${task.name} (${id})`);
  console.log(`  ${backend} loaded.`);
}
