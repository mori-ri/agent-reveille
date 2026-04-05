import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("update-notify", () => {
  describe("initUpdateNotifier", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      process.env.REVEILLE_SKIP_UPDATE_CHECK = undefined;
    });

    it("returns undefined when APP_VERSION is 'dev'", async () => {
      vi.doMock("../../src/utils/version.js", () => ({
        APP_VERSION: "dev",
      }));
      vi.doMock("update-notifier", () => ({
        default: vi.fn(),
      }));

      const { initUpdateNotifier } = await import("../../src/utils/update-notify.js");
      expect(initUpdateNotifier()).toBeUndefined();
    });

    it("returns undefined when REVEILLE_SKIP_UPDATE_CHECK=1", async () => {
      process.env.REVEILLE_SKIP_UPDATE_CHECK = "1";

      vi.doMock("../../src/utils/version.js", () => ({
        APP_VERSION: "1.0.0",
      }));
      vi.doMock("update-notifier", () => ({
        default: vi.fn(),
      }));

      const { initUpdateNotifier } = await import("../../src/utils/update-notify.js");
      expect(initUpdateNotifier()).toBeUndefined();
    });

    it("calls updateNotifier with correct options when version is set", async () => {
      process.env.REVEILLE_SKIP_UPDATE_CHECK = undefined;

      const mockNotifier = { check: vi.fn(), notify: vi.fn() };
      const mockUpdateNotifier = vi.fn(() => mockNotifier);

      vi.doMock("../../src/utils/version.js", () => ({
        APP_VERSION: "1.0.0",
      }));
      vi.doMock("update-notifier", () => ({
        default: mockUpdateNotifier,
      }));

      const { initUpdateNotifier } = await import("../../src/utils/update-notify.js");
      const result = initUpdateNotifier();

      expect(result).toBe(mockNotifier);
      expect(mockUpdateNotifier).toHaveBeenCalledWith({
        pkg: { name: "agent-reveille", version: "1.0.0" },
        updateCheckInterval: 1000 * 60 * 60 * 24,
      });
    });
  });

  describe("showUpdateNotification", () => {
    it("does not throw when notifier is undefined", async () => {
      vi.doMock("../../src/utils/version.js", () => ({
        APP_VERSION: "dev",
      }));
      vi.doMock("update-notifier", () => ({
        default: vi.fn(),
      }));

      const { showUpdateNotification } = await import("../../src/utils/update-notify.js");
      expect(() => showUpdateNotification(undefined)).not.toThrow();
    });

    it("calls notifier.notify with isGlobal: true", async () => {
      vi.doMock("../../src/utils/version.js", () => ({
        APP_VERSION: "1.0.0",
      }));
      vi.doMock("update-notifier", () => ({
        default: vi.fn(),
      }));

      const mockNotifier = { notify: vi.fn() };

      const { showUpdateNotification } = await import("../../src/utils/update-notify.js");
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      showUpdateNotification(mockNotifier as any);

      expect(mockNotifier.notify).toHaveBeenCalledWith({ isGlobal: true });
    });
  });
});
