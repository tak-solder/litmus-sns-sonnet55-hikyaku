# Build 27: 本番用Dockerfile（web / api）

## やること

- api を esbuild でバンドルする `build` スクリプトを `apps/api` に追加する。`src/index.ts` と `src/db/migrate.ts`（マイグレーションのエントリ）を `dist/` に出力する（shared はソース公開のため tsc では出力できない）
- `apps/web/next.config.ts` に `output: "standalone"` を足す（monorepo のため `outputFileTracingRoot` をリポジトリルートにする）
- 本番用の `docker/Dockerfile.api` と `docker/Dockerfile.web` を作る（マルチステージビルド、非 root 実行）。api イメージは `dist/` と `drizzle/` を含み、`node dist/index.js`（API 起動）と `node dist/db/migrate.js`（マイグレーション）の両方を実行できる
- `.dockerignore` を作る

## やらないこと

- ECR への push・デプロイ CI（build-24）
- ECS・RDS などのインフラ（build-23）
- web が `@litmus-sns/shared` を import するための `transpilePackages`（build-15）

## 対応する受け入れ基準

- なし（成果物: 本番環境のイメージ）

## 受け入れ基準

- [ ] `docker build -f docker/Dockerfile.api .` と `docker build -f docker/Dockerfile.web .` が通る
- [ ] api イメージで `node dist/index.js` が起動し、`/health` が応答する
- [ ] api イメージで `node dist/db/migrate.js` が実行でき、`drizzle/` のマイグレーションを適用できる
- [ ] イメージは非 root ユーザーで実行され、開発用依存と `.env` を含まない

## 参照する設計ドキュメント

- design-delta.md「本番構成（`infra/`）」「CI/CD と開発体制」
- build-02 の handoff.md（shared はソース公開。api の本番ビルドはバンドルで行う）

## BP見積もり

作成するファイル: `docker/Dockerfile.api`, `docker/Dockerfile.web`, `.dockerignore`、変更: `apps/api/package.json`, `apps/web/next.config.ts`, `pnpm-lock.yaml`（esbuild の devDependency 追加）、`docker/Dockerfile.dev`（影響確認）

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 3 | 2（ベース） |
| 実装行数（テスト含む） | 120 | 1 |
| API操作数 | 未指定 | — |
| 画面/ページ数 | 未指定 | — |
| DBテーブル/エンティティ数 | 未指定 | — |
| ベースBP（指標の最大値） | — | 2 |
| 影響ファイル数 | 4 | +1 |
| 基盤セットアップを含む | 未指定 | +0 |
| 外部API連携を含む | 未指定 | +0 |
| 既存コードの大規模リファクタ | 未指定 | +0 |
| **合計** | — | **3BP** |
