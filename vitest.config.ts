import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/lib/**/*.test.ts", "test/utils/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "e2e",
          include: ["test/e2e/**/*.test.{ts,tsx}"],
          testTimeout: 30_000,
          hookTimeout: 15_000,
        },
      },
    ],
  },
});
