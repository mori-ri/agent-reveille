import chalk from "chalk";
import {
  loadNotifyConfig,
  saveNotifyConfig,
  getEnabledProviders,
  type NotifyConfig,
} from "../lib/notify.js";

function printStatus(config: NotifyConfig) {
  const providers = getEnabledProviders(config);

  console.log(chalk.bold("\nNotification settings:\n"));

  if (config.slack?.webhookUrl) {
    console.log(`  ${chalk.green("✓")} Slack: ${config.slack.webhookUrl.slice(0, 40)}...`);
  } else {
    console.log(`  ${chalk.dim("○")} Slack: not configured`);
  }

  if (config.discord?.webhookUrl) {
    console.log(`  ${chalk.green("✓")} Discord: ${config.discord.webhookUrl.slice(0, 40)}...`);
  } else {
    console.log(`  ${chalk.dim("○")} Discord: not configured`);
  }

  if (config.macos?.enabled) {
    console.log(`  ${chalk.green("✓")} macOS: enabled`);
  } else {
    console.log(`  ${chalk.dim("○")} macOS: disabled`);
  }

  console.log(
    `\n  Active providers: ${providers.length > 0 ? providers.join(", ") : chalk.dim("none")}\n`
  );
}

export default async function notify(args: string[]) {
  const subcommand = args[0];

  if (!subcommand || subcommand === "status") {
    const config = loadNotifyConfig();
    printStatus(config);
    console.log(chalk.dim("  Usage:"));
    console.log(chalk.dim("    reveille notify slack <webhook-url>"));
    console.log(chalk.dim("    reveille notify discord <webhook-url>"));
    console.log(chalk.dim("    reveille notify macos on|off"));
    console.log(chalk.dim("    reveille notify remove slack|discord|macos\n"));
    return;
  }

  const config = loadNotifyConfig();

  if (subcommand === "slack") {
    const url = args[1];
    if (!url) {
      console.error("Usage: reveille notify slack <webhook-url>");
      process.exit(1);
    }
    config.slack = { webhookUrl: url };
    saveNotifyConfig(config);
    console.log(chalk.green("✓ Slack webhook configured"));
    return;
  }

  if (subcommand === "discord") {
    const url = args[1];
    if (!url) {
      console.error("Usage: reveille notify discord <webhook-url>");
      process.exit(1);
    }
    config.discord = { webhookUrl: url };
    saveNotifyConfig(config);
    console.log(chalk.green("✓ Discord webhook configured"));
    return;
  }

  if (subcommand === "macos") {
    const toggle = args[1];
    if (toggle !== "on" && toggle !== "off") {
      console.error("Usage: reveille notify macos on|off");
      process.exit(1);
    }
    config.macos = { enabled: toggle === "on" };
    saveNotifyConfig(config);
    console.log(chalk.green(`✓ macOS notifications ${toggle === "on" ? "enabled" : "disabled"}`));
    return;
  }

  if (subcommand === "remove") {
    const provider = args[1];
    if (provider === "slack") {
      delete config.slack;
    } else if (provider === "discord") {
      delete config.discord;
    } else if (provider === "macos") {
      delete config.macos;
    } else {
      console.error("Usage: reveille notify remove slack|discord|macos");
      process.exit(1);
    }
    saveNotifyConfig(config);
    console.log(chalk.green(`✓ ${provider} configuration removed`));
    return;
  }

  console.error(`Unknown subcommand: ${subcommand}`);
  process.exit(1);
}
