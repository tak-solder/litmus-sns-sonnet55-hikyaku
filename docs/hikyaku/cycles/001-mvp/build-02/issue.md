# Build 02: 共有パッケージ・Biome・CI

## やること

- `packages/shared` を作る（`pnpm-workspace.yaml` に `packages/*` を追加）。定数（本文300文字、画像5MB、フォロー上限5,000、ページサイズ20）と、エラー形式 `{ error: { code, message, fields } }` の zod スキーマ・エラーコード定義の置き場を用意する
- api から `@litmus-sns/shared` を import できるようにする（`apps/api/package.json` の依存、`tsconfig.json` の調整、import を確認するテスト）
- Biome（lint / format）を導入し、既存コードにも適用する
- GitHub Actions の CI を作る（typecheck / lint / test（実 PostgreSQL）/ マイグレーション検証）
- `docker/Dockerfile.dev` に新しい `package.json` の COPY を追加する

## やらないこと

- api のエラーハンドラ・リクエスト ID・OpenAPI・クライアント生成（build-26）
- CI の OpenAPI 差分確認（build-26 が CI に追加する）
- 業務ルートの実装（build-03 以降）
- デプロイ用の CD（build-24）

## 対応する受け入れ基準

- なし（基盤整備）

## 受け入れ基準

- [ ] CI がプルリクエストで typecheck / lint / test を実行して通る
- [ ] `packages/shared` を api から import できる

## 参照する設計ドキュメント

- design-delta.md「CI/CD と開発体制」「全体構成」
- codebase-survey.md「既存の規約・パターン」「拡張ポイント」

## BP見積もり

作成するファイル: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/constants.ts`, `packages/shared/src/errors.ts`, `apps/api/src/shared.test.ts`, `biome.json`, `.github/workflows/ci.yml`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 8 | 3（ベース） |
| 実装行数（テスト含む） | 250 | 2 |
| API操作数 | 未指定 | — |
| 画面/ページ数 | 未指定 | — |
| DBテーブル/エンティティ数 | 未指定 | — |
| ベースBP（指標の最大値） | — | 3 |
| 影響ファイル数 | 6 | +1 |
| 基盤セットアップを含む | あり | +1 |
| 外部API連携を含む | 未指定 | +0 |
| 既存コードの大規模リファクタ | 未指定 | +0 |
| **合計** | — | **5BP** |
