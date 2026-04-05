import chalk from "chalk";
import { type CheckStatus, type DiagnosticReport, runDiagnostics } from "../lib/doctor.js";

const ICONS: Record<CheckStatus, string> = {
  pass: chalk.green("✓"),
  fail: chalk.red("✗"),
  warn: chalk.yellow("⚠"),
};

function printReport(report: DiagnosticReport): void {
  console.log("");
  console.log(chalk.bold("reveille doctor"));
  console.log("");

  for (const check of report.checks) {
    const icon = ICONS[check.status];
    console.log(`  ${icon} ${check.message}`);
    if (check.detail) {
      console.log(chalk.gray(`    ${check.detail}`));
    }
  }

  console.log("");

  const counts: Record<CheckStatus, number> = { pass: 0, fail: 0, warn: 0 };
  for (const check of report.checks) {
    counts[check.status]++;
  }

  if (report.hasFail) {
    console.log(
      `${chalk.red(`${counts.fail} issue(s) found.`)} ${counts.warn} warning(s), ${counts.pass} passed.`,
    );
  } else if (report.hasWarn) {
    console.log(`${chalk.yellow(`${counts.warn} warning(s).`)} ${counts.pass} passed.`);
  } else {
    console.log(chalk.green(`All ${counts.pass} checks passed.`));
  }
}

export default async function doctor(_args: string[]): Promise<void> {
  const report = runDiagnostics();
  printReport(report);

  if (report.hasFail) {
    process.exit(1);
  }
}
