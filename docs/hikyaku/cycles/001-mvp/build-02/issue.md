# Build 02: API骨格・共有パッケージ・CI

## やること

- `packages/shared` を作る（`pnpm-workspace.yaml` に `packages/*` を追加）。定数（本文300文字、画像5MB、フォロー上限5,000、ページサイズ20）と zod スキーマの置き場を用意する
- api のエラー形式（`{ error: { code, message, fields } }`）、グローバルエラーハンドラ、リクエスト ID を実装する
- Hono + zod-openapi で OpenAPI 仕様を出力できるようにする（`/openapi.json`）。web 用クライアント生成のスクリプトも用意する
- Biome（lint / format）を導入する
- GitHub Actions の CI を作る（typecheck / lint / test（実 PostgreSQL）/ マイグレーション検証 / OpenAPI 差分確認）
- `docker/Dockerfile.dev` に新しい `package.json` の COPY を追加する

## やらないこと

- 業務ルートの実装（build-03 以降）
- デプロイ用の CD（build-24）
- web 側のクライアント利用（build-15）

## 対応する受け入れ基準

- なし（基盤整備）

## 受け入れ基準

- [ ] 入力不正・未認証・不在・競合のエラーが共通の形式で返る
- [ ] `/openapi.json` が OpenAPI 仕様を返し、`/health` が含まれる
- [ ] CI がプルリクエストで typecheck / lint / test を実行して通る
- [ ] `packages/shared` を api から import できる

## 参照する設計ドキュメント

- design-delta.md「API（REST + OpenAPI）」「CI/CD と開発体制」
- ADR: `20261030-api-rest-openapi.md`
- codebase-survey.md「既存の規約・パターン」「拡張ポイント」

## BP見積もり

作成するファイル: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/constants.ts`, `packages/shared/src/errors.ts`, `apps/api/src/errors.ts`, `apps/api/src/middleware/error-handler.ts`, `apps/api/src/middleware/request-id.ts`, `apps/api/src/openapi.ts`, `apps/api/src/app.test.ts`, `biome.json`, `.github/workflows/ci.yml`, `scripts/generate-api-client.ts`, `apps/api/src/middleware/error-handler.test.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 14 | 3（ベース） |
| 実装行数（テスト含む） | 700 | 3 |
| API操作数 | 0 | 1 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 4 | +1 |
| 基盤セットアップ | あり | +1 |
| 合計 | | 5 |
