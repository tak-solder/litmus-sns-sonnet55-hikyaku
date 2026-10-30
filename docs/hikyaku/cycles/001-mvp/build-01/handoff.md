# Build 01: ローカル環境とDB基盤 申し送り

## 後続ビルド向け

### 実装内容の要約

`docker compose up` で web / api / db(PostgreSQL 17 + pg_bigm) / mailpit / minio が起動する。api は起動のたびに `pnpm --filter api migrate` を実行し、成功した場合だけ dev サーバーを起動する。初回マイグレーション `0000_extensions.sql` で `pg_bigm` を有効化する。Vitest と、実 PostgreSQL に一意名の DB を作る `createTestDatabase()` を用意した。issue.md の受け入れ基準 1〜4 を満たす（基準 1・4 は compose を実際に起動して確認、基準 2・3 は自動テスト）。

### 公開インターフェース

- `loadConfig(env?): { databaseUrl, port }` — `DATABASE_URL` 必須、`PORT` は未指定で 8080、1〜65535 の整数のみ
- `createDb(databaseUrl): { db, pool }` — Drizzle の db と `pg.Pool`。使い終わったら `pool.end()`
- `runMigrations(databaseUrl): Promise<void>` — `apps/api/drizzle/` を適用する
- `createTestDatabase(): Promise<{ db, url, drop() }>` — マイグレーション済みの一意名 DB。`afterEach` / `afterAll` で `drop()` する。管理 URL は `TEST_DATABASE_ADMIN_URL`（既定 `postgres://postgres:postgres@localhost:5432/postgres`）
- scripts: `pnpm --filter api migrate` / `db:generate` / `test`
- スキーマの追加先は `apps/api/src/db/schema/index.ts`。テーブルを足したら `pnpm --filter api db:generate` でマイグレーションを生成する

### 実装中の判断

- `db-init` は作らず、拡張の有効化はマイグレーションだけで行う（G8 で承認済み）
- テストはホストで `pnpm --filter api test` を実行する前提。compose の db を `127.0.0.1:5432` に公開している
- compose の api には `DATABASE_URL` / `TEST_DATABASE_ADMIN_URL` / `SMTP_*` / `S3_*` をサービス名宛てで渡している

### 環境変更

- 環境変数: `.env.example` に一覧（`DATABASE_URL`, `PORT`, `TEST_DATABASE_ADMIN_URL`, `SMTP_*`, `S3_*`）。compose の既定値で動くので `.env` は不要
- ホストの公開ポート: db 5432、mailpit 8025(UI) / 1025(SMTP)、minio 9000(API) / 9001(コンソール)。すべて `127.0.0.1` にバインド。mailpit は `MAILPIT_UI_PORT` / `MAILPIT_SMTP_PORT` で変更できる
- 認証情報（ローカル専用の固定値）: postgres / postgres、minioadmin / minioadmin
- Docker イメージ: `docker/Dockerfile.db`（pg_bigm `v1.2-20250903` をソースからビルド）、`docker/Dockerfile.minio`（MinIO を Go でソースからビルド。初回 1 分ほど）

### 意図的に残した未対応

- `apps/api/src/index.ts` が `loadConfig` を使っていない。api の起動配線（設定の読み込み、DB の接続、シャットダウン）は build-02 で行う
- SMTP / S3 の設定読み込み（`loadConfig` の拡張）は、使う側のビルド（メール送信、画像）で行う
- コードレビュー（ラウンド 2）の指摘のうち、次は不採用: `Dockerfile.db` のベースイメージ digest 固定（ローカル開発専用）、`TEST_DATABASE_ADMIN_URL` の空文字を既定値に落とす挙動（ローカル既定の意図どおり）、`migrate.ts` の CLI 分離（realpath 比較に直し、compose で実行確認済み）、`drizzle.config.ts` の既定 URL（`generate` に DB 接続は不要）、MinIO の root 実行・healthcheck・ベースイメージ固定（ローカル専用で、api はまだ minio に依存しない）
- `security_review` は起動していない。認証・個人情報・決済に該当せず、ローカル開発専用の固定資格情報だけを扱うため

## 昇格素材（close-cycle 向け）

### overview への影響

なし（design-delta.md の「ローカル開発」どおり）。ローカルの依存サービスは db / mailpit / minio の 3 つ。

### 新たな制約

- 公式の MinIO イメージ（Docker Hub の `minio/minio`、quay.io）とバイナリ配布（dl.min.io のアーカイブは 410）が取得できない。ローカルは MinIO のソース（`RELEASE.2025-04-22T22-12-26Z`、コンソール付きの最後のリリース）をビルドして使う。本番は S3 を使うので影響しないが、ローカルの S3 互換ストレージの選定は将来見直す余地がある
- pg_bigm のソースビルドに `libicu-dev` が必要

### 踏んだ落とし穴

- `postgres:17` の named volume に直接 `PGDATA` を置くと `initdb: directory exists but is not empty` で失敗した。`PGDATA=/var/lib/postgresql/data/pgdata` にする
- `drizzle/0000_*.sql` を手書きで置くだけでは migrator が適用しない。`drizzle/meta/_journal.json` に載せる必要があるため、`drizzle-kit generate --custom` で生成する
- 他の compose プロジェクトが同じホストポート（mailpit の 8025 など）を使っていると `docker compose up` が失敗する。Mailpit のポートは環境変数で上書きできるようにした

### 覆した設計判断

なし
