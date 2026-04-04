import chalk from "chalk";
import cronstrue from "cronstrue";

import { listTemplates } from "../lib/templates.js";

export default async function templates(_args: string[]): Promise<void> {
  const all = listTemplates();

  console.log(chalk.bold("\nAvailable templates:\n"));

  for (const t of all) {
    const schedule =
      t.scheduleType === "cron" && t.scheduleCron
        ? cronstrue.toString(t.scheduleCron)
        : t.scheduleType;

    console.log(`  ${chalk.cyan.bold(t.id)}`);
    console.log(`    ${t.label} — ${t.description}`);
    console.log(chalk.dim(`    Agent: ${t.agent}  Schedule: ${schedule}`));
    console.log();
  }

  console.log(chalk.dim(`  Usage: reveille add --template <id> --dir <path>\n`));
}
