const args = process.argv.slice(2);
const command = args[0] ?? "dashboard";

async function main() {
  switch (command) {
    case "add":
      await (await import("../src/commands/add.js")).default(args.slice(1));
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
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    case "--version":
    case "-v":
      console.log("reveille v0.1.0");
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
   \x1b[33m█\x1b[37;43m ● ●\x1b[0m\x1b[33m█\x1b[0m      \x1b[33m♪\x1b[0m
   \x1b[33m████\x1b[40;37m ==<<\x1b[0m   \x1b[1mr e v e i l l e\x1b[0m
   \x1b[33m▀▀▀▀▀▀\x1b[0m     \x1b[33m♫\x1b[0m

  Usage: reveille <command> [options]

  Commands:
    add                Create a new scheduled task
    list, ls           List all tasks
    remove, rm <id>    Remove a task
    run <id>           Execute a task immediately
    logs [id]          View execution logs
    enable <id>        Enable task (load launchd plist)
    disable <id>       Disable task (unload launchd plist)
    dashboard          Open interactive TUI dashboard

  Options:
    -h, --help         Show this help
    -v, --version      Show version
`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
