import { uninstallPlist } from "../lib/scheduler.js";
import { deleteTask, getTask } from "../lib/tasks.js";

export default async function remove(args: string[]) {
  const id = args[0];
  if (!id) {
    console.error("Usage: reveille remove <task-id>");
    process.exit(1);
  }

  const task = getTask(id);
  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }

  uninstallPlist(id);
  deleteTask(id);
  console.log(`✓ Removed task: ${task.name} (${id})`);
}
