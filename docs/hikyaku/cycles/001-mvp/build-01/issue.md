# Build 01: ローカル環境とDB基盤

## やること

- `compose.yaml` に `db`（PostgreSQL + pg_bigm 拡張入りのイメージ）、`mailpit`、`minio` を追加し、`docker compose up` の1コマンドで依存ごと起動する
- `apps/api` に Drizzle ORM を導入する（`drizzle.config.ts`、DB クライアント、スキーマの入口、マイグレーションの実行スクリプト）
- 初回マイグレーションで拡張（`pg_bigm`）を有効化する。起動時に api がマイグレーションを適用できるようにする
- Vitest を導入し、実 PostgreSQL に対するテストの共通ヘルパー（テスト用 DB の作成・破棄）を用意する
- 環境変数の雛形（`.env.example`）を用意する

## やらないこと

- 業務テーブルの作成（各機能のビルドで追加する）
- エラー形式・OpenAPI・共有パッケージ・CI・lint（build-02）
- 本番インフラ（build-23, 24）

## 対応する受け入れ基準

- なし（基盤整備。後続のすべてのビルドの前提）

## 受け入れ基準

- [ ] `docker compose up` で web / api / db / mailpit / minio がすべて起動する
- [ ] `pnpm --filter api` のマイグレーション実行で空の DB に拡張が入る
- [ ] DB を使うテストが `docker compose` の `db` に対して通る
- [ ] Mailpit の UI と MinIO のコンソールに、README 未整備でも compose の定義から到達できる

## 参照する設計ドキュメント

- design-delta.md「ローカル開発」「データモデル」
- ADR: `20261030-search-pg-bigm.md`（拡張の要件）
- codebase-survey.md「リポジトリ概要」「ディレクトリ構成」

## BP見積もり

作成するファイル: `docker/Dockerfile.db`, `docker/db-init/01-extensions.sql`, `apps/api/drizzle.config.ts`, `apps/api/src/db/client.ts`, `apps/api/src/db/schema/index.ts`, `apps/api/src/db/migrate.ts`, `apps/api/drizzle/0000_extensions.sql`, `apps/api/vitest.config.ts`, `apps/api/src/test/db.ts`, `apps/api/src/db/client.test.ts`, `.env.example`, `apps/api/src/config.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 12 | 3（ベース） |
| 実装行数（テスト含む） | 400 | 2 |
| API操作数 | 0 | 1 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 3 | +0 |
| 基盤セットアップ | あり | +1 |
| 合計 | | 4 |
