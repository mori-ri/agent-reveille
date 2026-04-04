import { executeTask } from "../lib/executor.js";
import { getTask } from "../lib/tasks.js";
import { parseTokenUsage, estimateCost, saveCostEntry } from "../lib/costs.js";
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

  // Track cost if token usage is available
  if (execution.stdoutTail) {
    const usage = parseTokenUsage(execution.stdoutTail, task.agent);
    if (usage) {
      const cost = estimateCost(usage, task.agent);
      saveCostEntry({
        executionId: execution.id,
        taskId: task.id,
        timestamp: execution.startedAt,
        agent: task.agent,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCost: cost,
      });
      console.log(`  Cost: ~$${cost.toFixed(4)} (${usage.inputTokens} in / ${usage.outputTokens} out)`);
    }
  }

  if (execution.status === "success") {
    console.log(`✓ Completed in ${duration} (exit code: ${execution.exitCode})`);
  } else {
    console.log(`✗ ${execution.status} after ${duration} (exit code: ${execution.exitCode})`);
    process.exit(1);
  }
}
