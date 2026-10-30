# 既存コードベース調査結果

overview が未作成のため、リポジトリ全体を調査した。リポジトリは初期構築のみで、機能コードは無い。

## リポジトリ概要

- **技術スタック**: TypeScript / Node 26.12.0、Next.js 16.4.0（React 19.3、`cacheComponents` と `partialPrefetching` が有効）、Hono 4.13.0（`@hono/node-server`）
- **パッケージマネージャ**: pnpm 11.5.2（workspace は `apps/*`）。`allowBuilds` で esbuild のみビルド許可

## ディレクトリ構成

- `apps/web/` — Next.js。`app/` に layout / page / globals.css があるだけの create-next-app 直後の状態
- `apps/api/src/` — `app.ts`（`GET /health` のみの Hono アプリ）と `index.ts`（`PORT` 既定 8080 で serve）
- `docker/Dockerfile.dev` — web / api 共用の開発イメージ。ソースは COPY のみでボリュームマウントは無い
- `compose.yaml` — `web`（3000）と `api`（8080）の2サービスのみ。DB・メールキャッチャーは無い

## ユーザーストーリーとの関連箇所

全ストーリーが新規実装で、既存コードとの衝突は無い。拡張の接続先は次のとおり。

- `apps/api/src/app.ts` — ルート登録の起点
- `apps/web/app/` — 画面の追加先
- `compose.yaml` — PostgreSQL・メールキャッチャー・（必要なら）画像保存先の追加先

## 既存の規約・パターン

- **命名規約**: 規約と呼べるものは未確立。api は ESM（`type: module`）で import に `.js` 拡張子を付ける
- **テスト**: テストフレームワーク・テストコードは無い
- **lint / format**: 無い。`typecheck` スクリプトのみ（`pnpm -r typecheck`）
- **CI**: 無い（`.github` が無い）
- **共有コード**: `apps/*` のみで `packages/` が無い。web と api で型・スキーマを共有する場所が現状は無い

## 拡張ポイント

- `pnpm-workspace.yaml` の `packages` に `packages/*` を足せば共有パッケージを置ける
- `apps/web/AGENTS.md` に Next.js 16 固有の注意が書かれているため、web 実装時に読むこと
