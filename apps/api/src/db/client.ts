import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export type Database = NodePgDatabase<typeof schema>;

export function createDb(databaseUrl: string): { db: Database; pool: pg.Pool } {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  // アイドル接続の切断で 'error' が未処理になると、プロセスごと落ちる
  pool.on("error", (error) =>
    console.error("PostgreSQL の接続でエラーが発生しました", error),
  );
  return { db: drizzle(pool, { schema }), pool };
}
