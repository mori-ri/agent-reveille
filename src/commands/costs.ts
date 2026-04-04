import chalk from "chalk";
import { getCostSummary } from "../lib/costs.js";
import { listTasks } from "../lib/tasks.js";

function parseSinceDate(period: string | undefined): Date | undefined {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return undefined;
  }
}

export default async function costs(args: string[]) {
  const period = args[0];
  const since = parseSinceDate(period);
  const summary = getCostSummary({ since });

  console.log(chalk.bold(`\nCost Summary${period ? ` (${period})` : ""}:\n`));

  if (summary.entryCount === 0) {
    console.log(chalk.dim("  No cost data recorded yet."));
    console.log(chalk.dim("  Costs are tracked automatically when tasks produce token usage output.\n"));
    return;
  }

  console.log(`  Total cost:     ${chalk.yellow(`$${summary.totalCost.toFixed(4)}`)}`);
  console.log(`  Input tokens:   ${summary.totalInputTokens.toLocaleString()}`);
  console.log(`  Output tokens:  ${summary.totalOutputTokens.toLocaleString()}`);
  console.log(`  Executions:     ${summary.entryCount}`);

  const tasks = listTasks();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  console.log(chalk.bold("\n  By Task:\n"));

  const sorted = [...summary.byTask].sort((a, b) => b.totalCost - a.totalCost);
  for (const taskSummary of sorted) {
    const task = taskMap.get(taskSummary.taskId);
    const name = task ? task.name : taskSummary.taskId;
    console.log(`    ${chalk.cyan(name)} ${chalk.dim(`(${taskSummary.taskId})`)}`);
    console.log(
      `      $${taskSummary.totalCost.toFixed(4)} — ${taskSummary.totalInputTokens.toLocaleString()} in / ${taskSummary.totalOutputTokens.toLocaleString()} out — ${taskSummary.entryCount} runs`
    );
  }

  console.log();
}
