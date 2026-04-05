import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("package.json", "utf-8"));

export default defineConfig({
  entry: ["bin/reveille.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist/bin",
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "ink", "ink-text-input", "ink-select-input", "ink-spinner"],
  banner: {
    js: "#!/usr/bin/env node",
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
});
