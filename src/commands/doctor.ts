import chalk from "chalk";
import { createSystemEnv, runAllChecks, type CheckStatus, type DiagnosticCategory } from "../lib/doctor.js";
import type { Task } from "../lib/schema.js";
import { listTasks } from "../lib/tasks.js";

const STATUS_ICON: Record<CheckStatus, string> = {
  pass: chalk.green("✓"),
  warn: chalk.yellow("⚠"),
  fail: chalk.red("✗"),
};

function printCategory(cat: DiagnosticCategory): void {
  console.log(`\n  ${chalk.bold(cat.category)}`);
  if (cat.results.length === 0) {
    console.log(chalk.dim("    No checks to run"));
    return;
  }
  for (const r of cat.results) {
    console.log(`    ${STATUS_ICON[r.status]} ${r.message}`);
    if (r.detail) {
      console.log(chalk.dim(`      ${r.detail}`));
    }
  }
}

export default async function doctor(_args: string[]): Promise<void> {
  console.log(chalk.bold("\nreveille doctor\n"));

  const env = createSystemEnv();
  let tasks: Task[] = [];
  try {
    tasks = listTasks();
  } catch {
    // tasks.json may not exist yet
  }

  const categories = runAllChecks(env, tasks);
  for (const cat of categories) {
    printCategory(cat);
  }

  const counts = { pass: 0, warn: 0, fail: 0 };
  for (const r of categories.flatMap((c) => c.results)) {
    counts[r.status]++;
  }

  console.log(
    `\n  Summary: ${chalk.green(`${counts.pass} passed`)}, ${chalk.yellow(`${counts.warn} warnings`)}, ${chalk.red(`${counts.fail} failures`)}\n`
  );

  if (counts.fail > 0) {
    process.exit(1);
  }
}
