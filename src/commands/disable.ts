import { getTask, updateTask } from "../lib/tasks.js";
import { uninstallPlist } from "../lib/scheduler.js";

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

  uninstallPlist(id);
  updateTask(id, { enabled: false });
  console.log(`✓ Disabled: ${task.name} (${id})`);
  console.log("  launchd plist unloaded.");
}
