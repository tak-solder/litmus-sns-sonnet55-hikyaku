import { randomUUID } from "node:crypto";
import pg from "pg";
import { createDb, type Database } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";

export type TestDatabase = { db: Database; url: string; drop(): Promise<void> };

const DEFAULT_ADMIN_URL =
  "postgres://postgres:postgres@localhost:5432/postgres";

/** 管理用 URL のデータベース名だけを差し替えた URL を返す */
function withDatabase(adminUrl: string, name: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

async function withAdminClient<T>(
  adminUrl: string,
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** 一意名のデータベースを作成してマイグレーションを適用する。使い終わったら drop() を呼ぶ */
export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = process.env.TEST_DATABASE_ADMIN_URL || DEFAULT_ADMIN_URL;
  const name = `test_${randomUUID().replaceAll("-", "")}`;

  await withAdminClient(adminUrl, (client) =>
    client.query(`CREATE DATABASE "${name}"`),
  );

  const url = withDatabase(adminUrl, name);
  let pool: pg.Pool | undefined;
  const dropDatabase = async () => {
    await pool?.end().catch(() => undefined);
    pool = undefined;
    await withAdminClient(adminUrl, (client) =>
      client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`),
    );
  };

  try {
    await runMigrations(url);
  } catch (error) {
    await dropDatabase();
    throw error;
  }

  const created = createDb(url);
  pool = created.pool;
  return { db: created.db, url, drop: dropDatabase };
}
