import { initUpdateNotifier, showUpdateNotification } from "../src/utils/update-notify.js";
import { APP_VERSION } from "../src/utils/version.js";

const args = process.argv.slice(2);
const command = args[0] ?? "dashboard";

async function main() {
  const notifier = command !== "run" ? initUpdateNotifier() : undefined;

  switch (command) {
    case "add":
      await (await import("../src/commands/add.js")).default(args.slice(1));
      break;
    case "edit":
      await (await import("../src/commands/edit.js")).default(args.slice(1));
      break;
    case "list":
    case "ls":
      await (await import("../src/commands/list.js")).default(args.slice(1));
      break;
    case "remove":
    case "rm":
      await (await import("../src/commands/remove.js")).default(args.slice(1));
      break;
    case "run":
      await (await import("../src/commands/run.js")).default(args.slice(1));
      break;
    case "logs":
      await (await import("../src/commands/logs.js")).default(args.slice(1));
      break;
    case "enable":
      await (await import("../src/commands/enable.js")).default(args.slice(1));
      break;
    case "disable":
      await (await import("../src/commands/disable.js")).default(args.slice(1));
      break;
    case "dashboard":
      await (await import("../src/commands/dashboard.js")).default(args.slice(1));
      break;
    case "doctor":
      await (await import("../src/commands/doctor.js")).default(args.slice(1));
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    case "--version":
    case "-v":
      console.log(`reveille v${APP_VERSION}`);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }

  showUpdateNotification(notifier);
}

function printHelp() {
  console.log(`
   \x1b[33m█\x1b[37;43m ● ●\x1b[0m\x1b[33m█\x1b[0m      \x1b[33m♪\x1b[0m
   \x1b[33m████\x1b[40;37m ==<<\x1b[0m   \x1b[1mr e v e i l l e\x1b[0m
   \x1b[33m▀▀▀▀▀▀\x1b[0m     \x1b[33m♫\x1b[0m

  Usage: reveille <command> [options]

  Commands:
    add                Create a new scheduled task
    edit <id>          Edit an existing task
    list, ls           List all tasks
    remove, rm <id>    Remove a task
    run <id>           Execute a task immediately
    logs [id]          View execution logs
    enable <id>        Enable task (load launchd plist)
    disable <id>       Disable task (unload launchd plist)
    doctor             Diagnose common issues
    dashboard          Open interactive TUI dashboard

  Options for edit:
    --name <name>      Task name
    --prompt <text>    Agent prompt (sets command)
    --cmd <command>    Raw command (overrides --prompt)
    --model <model>    AI model name
    --cron <expr>      Cron schedule expression
    --interval <secs>  Interval in seconds
    --dir <path>       Working directory
    --after <id>       Run after another task succeeds

  Options for add:
    --name <name>      Task name (required for non-interactive)
    --cmd <command>    Command or prompt (required for non-interactive)
    --agent <id>       Agent: claude, codex, gemini, aider, custom
    --cron <expr>      Cron schedule expression
    --dir <path>       Working directory (default: cwd)
    --model <model>    AI model name
    --after <id>       Run this task after another task succeeds

  Options:
    -h, --help         Show this help
    -v, --version      Show version
`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
