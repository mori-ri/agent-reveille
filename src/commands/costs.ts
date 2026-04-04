import chalk from "chalk";
import { getCostSummary } from "../lib/costs.js";
import { listTasks } from "../lib/tasks.js";

export default async function costs(args: string[]) {
  const period = args[0]; // today, week, month, or undefined for all
  let since: Date | undefined;

  const now = new Date();
  if (period === "today") {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

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

  if (summary.byTask.length > 0) {
    const tasks = listTasks();
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    console.log(chalk.bold("\n  By Task:\n"));

    const sorted = [...summary.byTask].sort((a, b) => b.totalCost - a.totalCost);
    for (const ts of sorted) {
      const task = taskMap.get(ts.taskId);
      const name = task ? task.name : ts.taskId;
      console.log(`    ${chalk.cyan(name)} ${chalk.dim(`(${ts.taskId})`)}`);
      console.log(
        `      $${ts.totalCost.toFixed(4)} — ${ts.totalInputTokens.toLocaleString()} in / ${ts.totalOutputTokens.toLocaleString()} out — ${ts.entryCount} runs`
      );
    }
  }

  console.log();
}
