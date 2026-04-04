import chalk from "chalk";
import {
  loadNotifyConfig,
  saveNotifyConfig,
  getEnabledProviders,
  type NotifyConfig,
} from "../lib/notify.js";

function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function printStatus(config: NotifyConfig): void {
  const providers = getEnabledProviders(config);

  console.log(chalk.bold("\nNotification settings:\n"));

  if (config.slack?.webhookUrl) {
    console.log(`  ${chalk.green("\u2713")} Slack: ${config.slack.webhookUrl.slice(0, 40)}...`);
  } else {
    console.log(`  ${chalk.dim("\u25cb")} Slack: not configured`);
  }

  if (config.discord?.webhookUrl) {
    console.log(`  ${chalk.green("\u2713")} Discord: ${config.discord.webhookUrl.slice(0, 40)}...`);
  } else {
    console.log(`  ${chalk.dim("\u25cb")} Discord: not configured`);
  }

  if (config.macos?.enabled) {
    console.log(`  ${chalk.green("\u2713")} macOS: enabled`);
  } else {
    console.log(`  ${chalk.dim("\u25cb")} macOS: disabled`);
  }

  console.log(
    `\n  Active providers: ${providers.length > 0 ? providers.join(", ") : chalk.dim("none")}\n`
  );
}

export default async function notify(args: string[]): Promise<void> {
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

  switch (subcommand) {
    case "slack":
    case "discord": {
      const url = args[1];
      if (!url) {
        console.error(`Usage: reveille notify ${subcommand} <webhook-url>`);
        process.exit(1);
      }
      if (!isValidWebhookUrl(url)) {
        console.error("Error: webhook URL must be a valid HTTPS URL");
        process.exit(1);
      }
      config[subcommand] = { webhookUrl: url };
      saveNotifyConfig(config);
      console.log(chalk.green(`\u2713 ${subcommand === "slack" ? "Slack" : "Discord"} webhook configured`));
      return;
    }

    case "macos": {
      const toggle = args[1];
      if (toggle !== "on" && toggle !== "off") {
        console.error("Usage: reveille notify macos on|off");
        process.exit(1);
      }
      config.macos = { enabled: toggle === "on" };
      saveNotifyConfig(config);
      console.log(chalk.green(`\u2713 macOS notifications ${toggle === "on" ? "enabled" : "disabled"}`));
      return;
    }

    case "remove": {
      const provider = args[1];
      if (provider !== "slack" && provider !== "discord" && provider !== "macos") {
        console.error("Usage: reveille notify remove slack|discord|macos");
        process.exit(1);
      }
      delete config[provider];
      saveNotifyConfig(config);
      console.log(chalk.green(`\u2713 ${provider} configuration removed`));
      return;
    }

    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      process.exit(1);
  }
}
