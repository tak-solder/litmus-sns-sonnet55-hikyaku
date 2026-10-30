import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // 実 PostgreSQL への接続・DB 作成を含むので余裕を持たせる
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
