import { getTask, updateTask } from "../lib/tasks.js";
import { getScheduler, detectPlatform } from "../lib/platform.js";

export default async function disable(args: string[]) {
  const id = args[0];
  if (!id) {
    console.error("Usage: reveille disable <task-id>");
    process.exit(1);
  }

  const task = getTask(id);
  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }

  const scheduler = getScheduler();
  scheduler.uninstall(id);
  updateTask(id, { enabled: false });
  const backend = detectPlatform() === "linux" ? "systemd timer" : "launchd plist";
  console.log(`✓ Disabled: ${task.name} (${id})`);
  console.log(`  ${backend} unloaded.`);
}
