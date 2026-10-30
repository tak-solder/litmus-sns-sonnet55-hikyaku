# Build 01: ローカル環境とDB基盤

## 依存パッケージ

| パッケージ | 用途 | 備考 |
|-----------|------|------|
| `drizzle-orm` | ORM・マイグレーション実行 | 新規追加（apps/api, dependencies） |
| `pg` | PostgreSQL ドライバ | 新規追加（apps/api, dependencies） |
| `drizzle-kit` | マイグレーション生成 | 新規追加（apps/api, devDependencies） |
| `@types/pg` | `pg` の型 | 新規追加（devDependencies） |
| `vitest` | テストランナー | 新規追加（devDependencies） |

`pnpm --filter api add` で追加済み（lockfile 更新済み）。

## クラス設計

```ts
// apps/api/src/config.ts
export type Config = { databaseUrl: string; port: number };
export function loadConfig(env?: NodeJS.ProcessEnv): Config;
// DATABASE_URL が未設定・空文字なら throw。PORT は未指定なら 8080、指定時は 1〜65535 の整数でなければ throw

// apps/api/src/db/client.ts
export type Database = NodePgDatabase<typeof schema>;
export function createDb(databaseUrl: string): { db: Database; pool: Pool };

// apps/api/src/db/schema/index.ts
// 業務テーブルは後続ビルドで追加する。入口として空の export を置く。

// apps/api/src/db/migrate.ts
export function runMigrations(databaseUrl: string): Promise<void>; // drizzle/ を適用
// `pnpm --filter api migrate` から実行できるよう、直接実行時は DATABASE_URL で runMigrations を呼ぶ

// apps/api/src/test/db.ts
export type TestDatabase = { db: Database; url: string; drop(): Promise<void> };
export function createTestDatabase(): Promise<TestDatabase>;
// 管理用 URL（TEST_DATABASE_ADMIN_URL、既定 postgres://postgres:postgres@localhost:5432/postgres）で
// 一意名の DB を作成 → runMigrations → 返す。drop() は接続を閉じて DB を DROP する
```

`package.json` scripts: `migrate`（`tsx src/db/migrate.ts`）、`db:generate`（`drizzle-kit generate`）、`test`（`vitest run`）。

マイグレーションの流れ: compose の `api` は `pnpm --filter api migrate && pnpm --filter api dev` で起動し、起動のたびに未適用分を適用する。

## 作成するファイルと環境

- `docker/Dockerfile.db`: `postgres:17` に pg_bigm をソースからビルドして入れる（`ARG PG_BIGM_VERSION`）
- `compose.yaml`: `db`（healthcheck 付き、5432 公開）、`mailpit`（UI 8025 / SMTP 1025）、`minio`（API 9000 / コンソール 9001）を追加し、`api` に `depends_on: db (healthy)` と環境変数を足す
- `apps/api/drizzle.config.ts`、`apps/api/drizzle/0000_extensions.sql`（`CREATE EXTENSION IF NOT EXISTS pg_bigm;`）
- `apps/api/vitest.config.ts`、`apps/api/src/db/client.test.ts`、`.env.example`

## 非機能要件

- **セキュリティ**: 認証情報はローカル開発専用の固定値で、`.env.example` に載せる。実値は `.env*`（.gitignore 済み）に置く。db / mailpit / minio のポートは `127.0.0.1:` にバインドし、同一ネットワークの他端末から到達させない
- **テストの実行場所**: ホストで `pnpm --filter api test` を実行する前提。`TEST_DATABASE_ADMIN_URL` の既定は `localhost:5432`（db をホストへ公開しているため通る）。コンテナ内で実行する場合は compose の `api` が `TEST_DATABASE_ADMIN_URL` を `db` ホスト宛てに設定する
- **エラーハンドリング**: `loadConfig` は必須変数が無ければ明示的なメッセージで例外にする。マイグレーション失敗は非ゼロ終了にして compose の api を起動させない
- **マージ時点のデータ安全**: 本番データは存在せず、業務テーブルも作らない。追加するのは空 DB に対する冪等な `CREATE EXTENSION IF NOT EXISTS` のみ。既存機能（`/health`）は変更しない

## BP見積もり

| 段階 | BP |
|------|----|
| architectフェーズ段階 | 4BP |
| builderフェーズ段階 | 5BP |

**作成するファイル**（新規 13、約 300 行。上記 11 ファイルに、drizzle-kit が生成する `drizzle/meta/_journal.json` と `drizzle/meta/0000_snapshot.json` を加えた数）

- `docker/Dockerfile.db`（約 15 行）（拡張はマイグレーションで有効化するため、issue.md にあった `db-init` は作らない）
- `apps/api/drizzle.config.ts`（約 10 行）、`apps/api/drizzle/0000_extensions.sql`（1 行）
- `apps/api/src/config.ts`（約 25 行）、`apps/api/src/db/client.ts`（約 15 行）、`apps/api/src/db/schema/index.ts`（約 3 行）、`apps/api/src/db/migrate.ts`（約 25 行）
- `apps/api/vitest.config.ts`（約 10 行）、`apps/api/src/test/db.ts`（約 50 行）、`apps/api/src/db/client.test.ts`（約 50 行）、`.env.example`（約 15 行）

影響を受ける既存ファイル: `compose.yaml`、`apps/api/package.json`、`pnpm-lock.yaml`、`docker/Dockerfile.dev`（変更不要の見込みだが確認）、`.gitignore`（`.env.example` を除外対象から外す）

**builderフェーズ段階の内訳**

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 13 | 3（ベース） |
| 実装行数（テスト含む） | 300 | 2 |
| ベースBP（指標の最大値） | — | 3 |
| 影響ファイル数 | 5 | +1 |
| 基盤セットアップを含む | あり | +1 |
| **合計** | — | **5BP** |

5BP は `bpMax − 2`（6）未満のため分割しない。

## 実装ステップ

- [ ] Step 1: 依存パッケージの追加（完了）
- [ ] Step 2: `docker/Dockerfile.db`・`compose.yaml`（db / mailpit / minio。ポートは `127.0.0.1:` にバインド）・`.env.example`
- [ ] Step 3: `config.ts`・`db/client.ts`・`db/schema/index.ts`・`drizzle.config.ts`
- [ ] Step 4: `drizzle-kit generate --custom --name extensions` で `0000_extensions.sql` と `drizzle/meta/_journal.json`（journal に載らないと migrator が適用しない）を生成して SQL を書く。`db/migrate.ts`、compose の api 起動時マイグレーション
- [ ] Step 5: `vitest.config.ts`・`test/db.ts`・`client.test.ts`
- [ ] Step 6: ローカル検証（typecheck / test / `docker compose up`）
