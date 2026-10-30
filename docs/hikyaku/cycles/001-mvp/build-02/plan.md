# Build 02: 共有パッケージ・Biome・CI

## 依存パッケージ

| パッケージ | 用途 | 備考 |
|-----------|------|------|
| `zod` | `packages/shared` のスキーマ | 新規追加（shared） |
| `@biomejs/biome` | lint / format | 新規追加（ルート devDependencies） |
| `@litmus-sns/shared` | api から shared を import | `apps/api` に `workspace:*` で追加 |

追加は `add-library` スキルの手順（パッケージマネージャー経由・ライセンスとバージョンの確認）に従う。`@hono/zod-openapi` / `openapi-typescript` / `tsx`（ルート）は build-26 で追加する。

## クラス設計

### `packages/shared`（`@litmus-sns/shared`）

TypeScript ソースをそのまま公開する内部パッケージ。`exports` は `./src/index.ts` を指し、ビルドしない（api は tsx / vitest が直接読む）。

- `src/constants.ts`: `POST_BODY_MAX_LENGTH = 300`, `IMAGE_MAX_BYTES = 5 * 1024 * 1024`, `FOLLOW_LIMIT = 5000`, `PAGE_SIZE_DEFAULT = 20`, `PAGE_SIZE_MAX = 20`
- `src/errors.ts`:
  - `ERROR_CODES`（`validation_error` / `unauthorized` / `forbidden` / `not_found` / `conflict` / `internal_error`）と `ErrorCode` 型
  - `ERROR_STATUS: Record<ErrorCode, 400 | 401 | 403 | 404 | 409 | 500>`
  - `errorResponseSchema`: `{ error: { code: ErrorCode, message: string, fields: Record<string, string[]> } }` の zod スキーマ。`fields` は常に存在し、無ければ `{}`。型 `ErrorResponse` も export
- `src/index.ts`: 上の 2 ファイルの re-export
- `package.json`: `name: @litmus-sns/shared`, `type: module`, `exports`, `scripts.typecheck: tsc --noEmit`、依存 `zod`
- `tsconfig.json`: api と同じ NodeNext / strict。`noEmit: true`

### `apps/api`

- `package.json`: `@litmus-sns/shared` を追加。`build`（tsc 出力）を削除し、`typecheck` が型検査を担う（shared がソース公開のため。本番イメージは build-24 でバンドルする）
- `tsconfig.json`: `rootDir` / `outDir` を外し `noEmit: true` にする（shared のソースを import するため）
- `src/shared.test.ts`: `@litmus-sns/shared` の定数・`errorResponseSchema` を import して検証する（api から import できることの確認）

### ルート・CI

- `biome.json`: formatter はスペース 2・ダブルクォート（既存コードに合わせる）、recommended の lint、import の整理。`.next` / `drizzle/meta` / `packages/api-client` / `pnpm-lock.yaml` を除外
- ルート `package.json` scripts: `lint`（`biome check .`）, `format`（`biome check --write .`）, `test`（`pnpm -r test`）, `typecheck`（既存）
- `.github/workflows/ci.yml`: pull_request と main への push で実行。`permissions: contents: read`、第三者アクションは SHA 固定
  1. `pnpm install --frozen-lockfile`
  2. `pnpm typecheck`
  3. `pnpm lint`
  4. `docker compose up -d --build --wait db`（pg_bigm 入りの db。公式の postgres サービスコンテナでは `CREATE EXTENSION pg_bigm` が通らないため）
  5. `pnpm --filter api migrate` を空の DB に適用して検証し、`pnpm --filter api db:generate` で差分が出ないこと（`git diff --exit-code apps/api/drizzle`）を確認
  6. `pnpm test`
- `docker/Dockerfile.dev`: `packages/shared/package.json` の COPY を追加
- `pnpm-workspace.yaml`: `packages/*` を追加

OpenAPI 差分確認のステップは build-26 が `ci.yml` に追加する。

## 非機能要件

- **セキュリティ**: CI は読み取り権限（`contents: read`）のみ。第三者アクションはコミット SHA で固定する。shared にはシークレットを置かない
- **エラーハンドリング**: 該当なし（エラー形式の実装は build-26。ここでは契約の定義のみ）
- **マージ時点のデータ安全**: DB スキーマ・マイグレーション・保存形式に触れない。api の実行時の挙動は変えない（`/health` はそのまま）。api の `build` スクリプト削除は、現時点でこれを使う本番デプロイが無い（build-24 で作る）ため影響しない。`pnpm format` は既存コードの整形のみで、意味を変えない

## BP見積もり

| 段階 | BP |
|------|----|
| architectフェーズ段階 | 5BP |
| builderフェーズ段階 | 5BP |

builder 段階の最初の見積もりは 7BP（影響ファイル 9 件、+3）で、`bpMax − 2` 以上だったため build-manager で build-26 に分割した（questions.md Q1）。以下は分割後の値。

**作成するファイル**（8 ファイル）

- `packages/shared/package.json`（約 20 行）
- `packages/shared/tsconfig.json`（約 10 行）
- `packages/shared/src/index.ts`（約 5 行）
- `packages/shared/src/constants.ts`（約 15 行）
- `packages/shared/src/errors.ts`（約 40 行）
- `apps/api/src/shared.test.ts`（約 50 行）
- `biome.json`（約 30 行）
- `.github/workflows/ci.yml`（約 60 行）

**builderフェーズ段階の内訳**

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

影響ファイル 6 = ルート `package.json`, `pnpm-workspace.yaml`, `apps/api/package.json`, `apps/api/tsconfig.json`, `Dockerfile.dev`, `compose.yaml`（CI が db サービスを使う）。

## 実装ステップ

- [ ] Step 1: `pnpm-workspace.yaml` に `packages/*` を追加し、`packages/shared` を作る（constants / errors / index）
- [ ] Step 2: 依存を追加する（`add-library` の手順）。shared に `zod`、api に `@litmus-sns/shared`、ルートに biome
- [ ] Step 3: api の `package.json` / `tsconfig.json` を調整し、`Dockerfile.dev` の COPY を追加する
- [ ] Step 4: `biome.json` を作り、既存コードを含めて `pnpm format` を適用する
- [ ] Step 5: `shared.test.ts` を実装する（test-spec.md に従う）
- [ ] Step 6: `.github/workflows/ci.yml` を作る
- [ ] Step 7: ローカル検証（typecheck / lint / test / compose で api の起動確認）
