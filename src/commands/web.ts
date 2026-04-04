import chalk from "chalk";
import { startWebServer } from "../lib/web-server.js";

export default async function web(args: string[]) {
  const portArg = args[0];
  const port = portArg ? parseInt(portArg, 10) : 3131;

  if (isNaN(port) || port < 1 || port > 65535) {
    console.error("Invalid port number");
    process.exit(1);
  }

  console.log(chalk.bold("\nreveille web dashboard\n"));

  const server = startWebServer(port);

  server.on("listening", () => {
    console.log(`  ${chalk.green("✓")} Server running at ${chalk.cyan(`http://localhost:${port}`)}`);
    console.log(chalk.dim("  Press Ctrl+C to stop\n"));
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(chalk.red(`  Port ${port} is already in use. Try: reveille web ${port + 1}`));
    } else {
      console.error(chalk.red(`  Server error: ${err.message}`));
    }
    process.exit(1);
  });

  // Keep the process alive
  await new Promise(() => {});
}
