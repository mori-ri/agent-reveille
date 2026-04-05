import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resetMigrationState } from "../../src/lib/db.js";

export interface TestEnv {
  tmpDir: string;
  cleanup: () => void;
}

export function createTestEnv(): TestEnv {
  const tmpDir = mkdtempSync(join(tmpdir(), "reveille-e2e-"));

  // Create directory structure that paths.ts expects
  mkdirSync(join(tmpDir, ".config", "reveille"), { recursive: true });
  mkdirSync(join(tmpDir, ".local", "share", "reveille", "logs"), { recursive: true });
  mkdirSync(join(tmpDir, "Library", "LaunchAgents"), { recursive: true });

  // Set environment variables for in-process tests (ink-testing-library)
  const prevHome = process.env.REVEILLE_HOME;
  const prevSkip = process.env.REVEILLE_SKIP_LAUNCHCTL;
  process.env.REVEILLE_HOME = tmpDir;
  process.env.REVEILLE_SKIP_LAUNCHCTL = "1";

  // Reset migration cache so each test starts fresh
  resetMigrationState();

  return {
    tmpDir,
    cleanup() {
      // Restore environment
      if (prevHome === undefined) {
        delete process.env.REVEILLE_HOME;
      } else {
        process.env.REVEILLE_HOME = prevHome;
      }
      if (prevSkip === undefined) {
        delete process.env.REVEILLE_SKIP_LAUNCHCTL;
      } else {
        process.env.REVEILLE_SKIP_LAUNCHCTL = prevSkip;
      }
      // Remove temp directory
      rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}
