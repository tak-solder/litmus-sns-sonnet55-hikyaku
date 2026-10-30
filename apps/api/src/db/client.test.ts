import { sql } from "drizzle-orm";
import pg from "pg";
import { afterEach, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "../test/db.js";
import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";

const unreachableUrl = "postgres://postgres:postgres@localhost:1/none";
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL || "postgres://postgres:postgres@localhost:5432/postgres";

const created: TestDatabase[] = [];
async function newTestDatabase() {
  const database = await createTestDatabase();
  created.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(created.splice(0).map((database) => database.drop()));
});

async function query<T extends pg.QueryResultRow>(url: string, text: string, values: unknown[] = []) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query<T>(text, values)).rows;
  } finally {
    await client.end();
  }
}

describe("createDb", () => {
  it("接続できる db と pool を返し、SQL を実行できる", async () => {
    const { url } = await newTestDatabase();
    const { db, pool } = createDb(url);
    try {
      const result = await db.execute(sql`select 1 as v`);
      expect(result.rows[0]?.v).toBe(1);
    } finally {
      await pool.end();
    }
  });

  it("到達できない接続先では、createDb は投げず実行時にエラーになる", async () => {
    const { db, pool } = createDb(unreachableUrl);
    try {
      await expect(db.execute(sql`select 1`)).rejects.toThrow();
    } finally {
      await pool.end();
    }
  });
});

describe("runMigrations", () => {
  it("空の DB に pg_bigm 拡張が入る", async () => {
    const { url } = await newTestDatabase();
    const rows = await query(url, "select extname from pg_extension where extname = 'pg_bigm'");
    expect(rows).toEqual([{ extname: "pg_bigm" }]);
  });

  it("2 回続けて実行しても成功する（冪等）", async () => {
    const { url } = await newTestDatabase();
    await expect(runMigrations(url)).resolves.toBeUndefined();
    const rows = await query(url, "select extname from pg_extension where extname = 'pg_bigm'");
    expect(rows).toHaveLength(1);
  });

  it("業務テーブルを作らない", async () => {
    const { url } = await newTestDatabase();
    const rows = await query(url, "select table_name from information_schema.tables where table_schema = 'public'");
    expect(rows).toHaveLength(0);
  });

  it("接続できない DB に対しては reject する", async () => {
    await expect(runMigrations(unreachableUrl)).rejects.toThrow();
  });
});

describe("createTestDatabase", () => {
  it("マイグレーション済みの一意名 DB を 2 つ作成する", async () => {
    const first = await newTestDatabase();
    const second = await newTestDatabase();

    const names = await Promise.all(
      [first, second].map(async ({ url }) => {
        const [row] = await query<{ name: string }>(url, "select current_database() as name");
        const extensions = await query(url, "select 1 from pg_extension where extname = 'pg_bigm'");
        expect(extensions).toHaveLength(1);
        expect(new URL(url).pathname).toBe(`/${row?.name}`);
        return row?.name;
      }),
    );
    expect(names[0]).not.toBe(names[1]);
  });

  it("drop() で DB が削除され、2 回続けて呼んでも reject されない", async () => {
    const database = await createTestDatabase();
    const name = new URL(database.url).pathname.slice(1);

    await database.drop();
    await expect(database.drop()).resolves.toBeUndefined();

    const rows = await query(adminUrl, "select 1 from pg_database where datname = $1", [name]);
    expect(rows).toHaveLength(0);
  });

  it("TEST_DATABASE_ADMIN_URL を上書きでき、到達不能なら reject する", async () => {
    const original = process.env.TEST_DATABASE_ADMIN_URL;
    try {
      process.env.TEST_DATABASE_ADMIN_URL = adminUrl;
      await newTestDatabase();

      process.env.TEST_DATABASE_ADMIN_URL = "postgres://postgres:postgres@localhost:1/postgres";
      await expect(createTestDatabase()).rejects.toThrow();
    } finally {
      if (original === undefined) delete process.env.TEST_DATABASE_ADMIN_URL;
      else process.env.TEST_DATABASE_ADMIN_URL = original;
    }
  });
});
