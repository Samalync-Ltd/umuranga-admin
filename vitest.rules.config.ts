import { defineConfig } from "vitest/config";

/** Emulator-backed rules tests. Separate config: node environment, no jsdom. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
  },
});
