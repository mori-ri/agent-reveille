import chalk from "chalk";
import { runAllChecks, createSystemEnv, type DiagnosticCategory, type CheckStatus } from "../lib/doctor.js";
import { listTasks } from "../lib/tasks.js";

const STATUS_ICON: Record<CheckStatus, string> = {
  pass: chalk.green("✓"),
  warn: chalk.yellow("⚠"),
  fail: chalk.red("✗"),
};

function printCategory(cat: DiagnosticCategory) {
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

export default async function doctor(_args: string[]) {
  console.log(chalk.bold("\nreveille doctor\n"));

  const env = createSystemEnv();
  let tasks: ReturnType<typeof listTasks> = [];
  try {
    tasks = listTasks();
  } catch {
    // tasks.json may not exist yet
  }

  const categories = runAllChecks(env, tasks);

  for (const cat of categories) {
    printCategory(cat);
  }

  const all = categories.flatMap((c) => c.results);
  const passed = all.filter((r) => r.status === "pass").length;
  const warnings = all.filter((r) => r.status === "warn").length;
  const failures = all.filter((r) => r.status === "fail").length;

  console.log(
    `\n  Summary: ${chalk.green(`${passed} passed`)}, ${chalk.yellow(`${warnings} warnings`)}, ${chalk.red(`${failures} failures`)}\n`
  );

  if (failures > 0) {
    process.exit(1);
  }
}
