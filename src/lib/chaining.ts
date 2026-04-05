import { formatDuration } from "../utils/format.js";
import { executeTask } from "./executor.js";
import { getDependentTasks } from "./tasks.js";

export async function runDependentChain(taskId: string, triggerExecutionId: string): Promise<void> {
  const dependents = getDependentTasks(taskId);

  for (const dep of dependents) {
    console.log(`\n⟶ Chained: ${dep.name} (${dep.id})`);
    try {
      const execution = await executeTask(dep.id, triggerExecutionId);
      const duration = execution.finishedAt
        ? formatDuration(
            new Date(execution.finishedAt).getTime() - new Date(execution.startedAt).getTime(),
          )
        : "?";
      if (execution.status === "success") {
        console.log(`  ✓ ${dep.name} completed in ${duration}`);
        await runDependentChain(dep.id, execution.id);
      } else {
        console.log(`  ✗ ${dep.name} ${execution.status} after ${duration}`);
      }
    } catch (err) {
      console.error(`  ✗ Failed to start ${dep.name}: ${(err as Error).message}`);
    }
  }
}
