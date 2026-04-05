import updateNotifier from "update-notifier";
import { APP_VERSION } from "./version.js";

const PACKAGE_NAME = "agent-reveille";

type Notifier = ReturnType<typeof updateNotifier>;

export function initUpdateNotifier(): Notifier | undefined {
  if (APP_VERSION === "dev") return undefined;
  if (process.env.REVEILLE_SKIP_UPDATE_CHECK === "1") return undefined;

  return updateNotifier({
    pkg: { name: PACKAGE_NAME, version: APP_VERSION },
    updateCheckInterval: 1000 * 60 * 60 * 24,
  });
}

export function showUpdateNotification(notifier: Notifier | undefined): void {
  if (!notifier) return;
  notifier.notify({ isGlobal: true });
}
