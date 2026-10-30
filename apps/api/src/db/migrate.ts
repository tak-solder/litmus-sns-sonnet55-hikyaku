import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadConfig } from "../config.js";
import { createDb } from "./client.js";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export async function runMigrations(databaseUrl: string): Promise<void> {
  const { db, pool } = createDb(databaseUrl);
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}

// `pnpm --filter api migrate` からの直接実行
const entry = process.argv[1];
if (entry && realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))) {
  Promise.resolve()
    .then(() => runMigrations(loadConfig().databaseUrl))
    .then(
      () => console.log("マイグレーションを適用しました"),
      (error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      },
    );
}
