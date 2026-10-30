# Build 26: APIエラー形式・OpenAPI・クライアント生成

## やること

- api のエラー形式（`{ error: { code, message, fields } }`）、`AppError`、グローバルエラーハンドラ、未定義パスの 404、リクエスト ID を実装する。エラーコード・スキーマは build-02 の `packages/shared` を使う
- Hono + zod-openapi で OpenAPI 仕様を出力できるようにする（`/openapi.json`）。`/health` を OpenAPI ルートとして定義し、zod 検証失敗を共通エラー形式に変換する
- web 用クライアント（型定義）の生成スクリプトを用意し、`packages/api-client/schema.d.ts` を生成する
- CI に OpenAPI 仕様と生成クライアントの差分確認（`generate:api-client --check`）を追加する
- `apps/api/src/index.ts` で `loadConfig` を使い、シャットダウン処理を入れる

## やらないこと

- 業務ルートの実装（build-03 以降）
- web 側のクライアント利用・`packages/api-client` の package.json 化（build-15）
- DB 接続の配線（業務ルートが生まれる build-03 で `createApp` に渡す）
- デプロイ用の CD（build-24）

## 対応する受け入れ基準

- なし（基盤整備）

## 受け入れ基準

- [ ] 入力不正・未認証・不在・競合のエラーが共通の形式で返る
- [ ] `/openapi.json` が OpenAPI 仕様を返し、`/health` が含まれる
- [ ] CI が OpenAPI 仕様と生成クライアントの差分を検出する

## 参照する設計ドキュメント

- design-delta.md「API（REST + OpenAPI）」「CI/CD と開発体制」
- ADR: `20261030-api-rest-openapi.md`
- build-02 の handoff.md（`packages/shared` の公開物、Biome・CI の構成）

## BP見積もり

作成するファイル: `apps/api/src/errors.ts`, `apps/api/src/middleware/error-handler.ts`, `apps/api/src/middleware/request-id.ts`, `apps/api/src/openapi.ts`, `apps/api/src/app.test.ts`, `apps/api/src/middleware/error-handler.test.ts`, `scripts/generate-api-client.ts`, `packages/api-client/schema.d.ts`（生成物）

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 8 | 3（ベース） |
| 実装行数（テスト含む） | 420 | 2 |
| API操作数 | 未指定 | — |
| 画面/ページ数 | 未指定 | — |
| DBテーブル/エンティティ数 | 未指定 | — |
| ベースBP（指標の最大値） | — | 3 |
| 影響ファイル数 | 6 | +1 |
| 基盤セットアップを含む | あり | +1 |
| 外部API連携を含む | 未指定 | +0 |
| 既存コードの大規模リファクタ | 未指定 | +0 |
| **合計** | — | **5BP** |
