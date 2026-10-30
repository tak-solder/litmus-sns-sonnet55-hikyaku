import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // 全スタックの合成を含むので余裕を持たせる
    testTimeout: 60_000,
  },
});
