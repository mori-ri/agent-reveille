import { recordExecutionCost } from "../lib/costs.js";
import { executeTask } from "../lib/executor.js";
import { getTask } from "../lib/tasks.js";
import { formatDuration } from "../utils/format.js";

export default async function run(args: string[]) {
  const id = args[0];
  if (!id) {
    console.error("Usage: reveille run <task-id>");
    process.exit(1);
  }

  const task = getTask(id);
  if (!task) {
    console.error(`Task not found: ${id}`);
    process.exit(1);
  }

  console.log(`▶ Running: ${task.name} (${task.agent})`);
  console.log(`  Command: ${task.command}`);
  console.log(`  Dir:     ${task.workingDir}`);
  console.log("");

  const execution = await executeTask(id);

  console.log("");
  const duration = execution.finishedAt
    ? formatDuration(
        new Date(execution.finishedAt).getTime() - new Date(execution.startedAt).getTime()
      )
    : "?";

  const cost = recordExecutionCost(execution, task);
  if (cost !== null) {
    console.log(`  Cost: ~$${cost.toFixed(4)}`);
  }

  if (execution.status === "success") {
    console.log(`✓ Completed in ${duration} (exit code: ${execution.exitCode})`);
  } else {
    console.log(`✗ ${execution.status} after ${duration} (exit code: ${execution.exitCode})`);
    process.exit(1);
  }
}
