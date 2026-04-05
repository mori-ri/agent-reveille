import { execFile } from "node:child_process";
import { resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../../..");
const ENTRY_POINT = resolve(PROJECT_ROOT, "bin/reveille.ts");

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function runCLI(args: string[], tmpDir: string): Promise<CLIResult> {
  return new Promise((resolve) => {
    execFile(
      "npx",
      ["tsx", ENTRY_POINT, ...args],
      {
        cwd: PROJECT_ROOT,
        timeout: 15_000,
        env: {
          ...process.env,
          REVEILLE_HOME: tmpDir,
          REVEILLE_SKIP_LAUNCHCTL: "1",
          REVEILLE_SKIP_UPDATE_CHECK: "1",
          NO_COLOR: "1",
          FORCE_COLOR: "0",
        },
      },
      (error, stdout, stderr) => {
        let exitCode = 0;
        if (error) {
          exitCode = typeof error.code === "number" ? error.code : 1;
        }
        resolve({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode,
        });
      },
    );
  });
}
