# Build 02: API骨格・共有パッケージ・CI

## 依存パッケージ

| パッケージ | 用途 | 備考 |
|-----------|------|------|
| `zod` | `packages/shared` のスキーマ | 新規追加（shared） |
| `@hono/zod-openapi` | OpenAPI 定義付きルート、`/openapi.json` | 新規追加（api）。hono 本体は 4.13.0 固定のまま |
| `@biomejs/biome` | lint / format | 新規追加（ルート devDependencies） |
| `tsx` | `scripts/generate-api-client.ts` の実行 | 新規追加（ルート devDependencies。api には導入済み） |
| `openapi-typescript` | OpenAPI から web 用の型定義を生成 | 新規追加（ルート devDependencies） |

追加は `add-library` スキルの手順（パッケージマネージャー経由・ライセンスとバージョンの確認）に従う。

## クラス設計

### `packages/shared`（`@litmus-sns/shared`）

TypeScript ソースをそのまま公開する内部パッケージ。`exports` は `./src/index.ts` を指し、ビルドしない（api は tsx / vitest が直接読む）。

- `src/constants.ts`: `POST_BODY_MAX_LENGTH = 300`, `IMAGE_MAX_BYTES = 5 * 1024 * 1024`, `FOLLOW_LIMIT = 5000`, `PAGE_SIZE_DEFAULT = 20`, `PAGE_SIZE_MAX = 20`
- `src/errors.ts`:
  - `ERROR_CODES`（`validation_error` / `unauthorized` / `forbidden` / `not_found` / `conflict` / `internal_error`）と `ErrorCode` 型
  - `ERROR_STATUS: Record<ErrorCode, 400 | 401 | 403 | 404 | 409 | 500>`
  - `errorResponseSchema`: `{ error: { code: ErrorCode, message: string, fields: Record<string, string[]> } }` の zod スキーマ。`fields` は常に存在し、無ければ `{}`
- `src/index.ts`: 上の 2 ファイルの re-export

### `apps/api`

```ts
// src/errors.ts
export class AppError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly fields: Record<string, string[]> = {});
  get status(): number; // ERROR_STATUS[code]
}
export const notFound: (message?: string) => AppError;      // 他のコードも同様の短縮関数を用意する
export const toErrorBody: (code: ErrorCode, message: string, fields?: Record<string, string[]>) => ErrorResponse;

// src/middleware/request-id.ts
export type AppEnv = { Variables: { requestId: string } };
export const requestId: MiddlewareHandler<AppEnv>;
// X-Request-Id が /^[A-Za-z0-9_-]{1,64}$/ に合えば引き継ぎ、そうでなければ randomUUID。応答ヘッダにも付ける

// src/middleware/error-handler.ts
export const errorHandler: ErrorHandler<AppEnv>;       // AppError / HTTPException / ZodError / その他 → 共通形式
export const notFoundHandler: NotFoundHandler<AppEnv>; // 未定義パスも 404 の共通形式

// src/openapi.ts
export const createOpenApiApp: () => OpenAPIHono<AppEnv>;
// defaultHook で zod 検証失敗を validation_error（fields にパスごとのメッセージ）に変換する。
// requestId / errorHandler / notFoundHandler を組み込む
export const mountOpenApi: (app: OpenAPIHono<AppEnv>) => void;
// GET /openapi.json（OpenAPI 3.1、bearerAuth のセキュリティスキームを登録）
export const errorResponses: (...codes: ErrorCode[]) => ResponsesObject;
// 業務ルートが共通エラー形式を OpenAPI に載せるためのヘルパー

// src/app.ts
export const createApp: () => OpenAPIHono<AppEnv>; // /health を createRoute で定義し、mountOpenApi を呼ぶ
export const app: OpenAPIHono<AppEnv>;
```

- `src/index.ts` を更新する: `loadConfig()` の `port` を使い、SIGTERM / SIGINT で `server.close()` して終了する。DB 接続は業務ルートが生まれる build-03 で `createApp` に渡す
- `package.json`: 依存追加、`@litmus-sns/shared` を `workspace:*` で追加、`lint` は持たせずルートで実行する。`build` は tsc で出力しなくなるため削除する（shared がソース公開のため。本番イメージは build-24 でバンドルする）
- `tsconfig.json`: `rootDir` / `outDir` を外し `noEmit: true` にする（shared のソースを import するため）

### ルート・CI・スクリプト

- `biome.json`: formatter はスペース 2・ダブルクォート（既存コードに合わせる）、recommended の lint、import の整理。`.next` / `drizzle/meta` / `packages/api-client` を除外
- ルート `package.json` scripts: `lint`（`biome check .`）, `format`（`biome check --write .`）, `test`（`pnpm -r test`）, `generate:api-client`, `typecheck`（既存）
- `scripts/generate-api-client.ts`: `createApp().getOpenAPI31Document(...)` から仕様を得て `openapi-typescript` で `packages/api-client/schema.d.ts` を書き出す。`--check` を渡すと書き出さず、既存ファイルとの差分があれば終了コード 1
- `.github/workflows/ci.yml`: pull_request と main への push で実行
  1. `pnpm install --frozen-lockfile`
  2. `pnpm typecheck`
  3. `pnpm lint`
  4. `docker compose up -d --build --wait db`（pg_bigm 入りの db。公式の postgres サービスコンテナでは `CREATE EXTENSION pg_bigm` が通らないため）
  5. `pnpm --filter api migrate` を空の DB に適用して検証し、`pnpm --filter api db:generate` で差分が出ないこと（`git diff --exit-code apps/api/drizzle`）を確認
  6. `pnpm test`
  7. `pnpm generate:api-client --check`
- `docker/Dockerfile.dev`: `packages/shared/package.json` の COPY を追加（`packages/api-client` は package.json が無いため不要）
- `pnpm-workspace.yaml`: `packages/*` を追加

## 非機能要件

- **セキュリティ**: 500 応答には内部エラーの message を含めず固定文言にし、詳細はログにだけ出す。リクエスト ID は受け取った値を検証してから使い、ログ・ヘッダへの注入を防ぐ。CI は読み取り権限（`contents: read`）のみ
- **エラーハンドリング**: 未捕捉の例外・未定義パス・zod 検証失敗・`HTTPException` をすべて共通形式に変換する。ログには requestId を付ける
- **マージ時点のデータ安全**: DB スキーマ・マイグレーション・保存形式に触れない。既存 API は `/health`（応答 `{status:"ok"}` を維持）だけで、既存データを読み書きしない。api の `build` スクリプト削除は、現時点でこれを使う本番デプロイが無い（build-24 で作る）ため影響しない

## BP見積もり

| 段階 | BP |
|------|----|
| architectフェーズ段階 | 5BP |
| builderフェーズ段階 | 5BP |

**作成するファイル**（15 ファイル。`packages/api-client/schema.d.ts` は生成物のため行数に数えない）

- `packages/shared/package.json`（約 20 行）
- `packages/shared/tsconfig.json`（約 10 行）
- `packages/shared/src/index.ts`（約 5 行）
- `packages/shared/src/constants.ts`（約 15 行）
- `packages/shared/src/errors.ts`（約 40 行）
- `apps/api/src/errors.ts`（約 40 行）
- `apps/api/src/middleware/request-id.ts`（約 25 行）
- `apps/api/src/middleware/error-handler.ts`（約 70 行）
- `apps/api/src/openapi.ts`（約 80 行）
- `apps/api/src/app.test.ts`（約 120 行）
- `apps/api/src/middleware/error-handler.test.ts`（約 130 行）
- `biome.json`（約 30 行）
- `.github/workflows/ci.yml`（約 60 行）
- `scripts/generate-api-client.ts`（約 50 行）
- `packages/api-client/schema.d.ts`（生成物）

**builderフェーズ段階の内訳**

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 15 | 3（ベース） |
| 実装行数（テスト含む） | 650 | 3 |
| API操作数 | 未指定 | — |
| 画面/ページ数 | 未指定 | — |
| DBテーブル/エンティティ数 | 未指定 | — |
| ベースBP（指標の最大値） | — | 3 |
| 影響ファイル数 | 6 | +1 |
| 基盤セットアップを含む | あり | +1 |
| 外部API連携を含む | 未指定 | +0 |
| 既存コードの大規模リファクタ | 未指定 | +0 |
| **合計** | — | **5BP** |

影響ファイル 6 = `app.ts`, `index.ts`, `config.ts`, ルート `package.json`, `Dockerfile.dev`, ADR `api-rest-openapi`。合計 5 は `bpMax − 2`（6）未満なので分割しない。

## 実装ステップ

- [ ] Step 1: `pnpm-workspace.yaml` に `packages/*` を追加し、`packages/shared` を作る（constants / errors / index）
- [ ] Step 2: 依存を追加する（`add-library` の手順）。api に `@hono/zod-openapi` と `@litmus-sns/shared`、ルートに biome / tsx / openapi-typescript
- [ ] Step 3: api の `errors.ts`、`request-id.ts`、`error-handler.ts` を実装する
- [ ] Step 4: `openapi.ts` と `app.ts`（`/health` を OpenAPI ルート化）、`index.ts`（loadConfig と graceful shutdown）を実装する
- [ ] Step 5: `tsconfig.json` / `package.json` の調整、`Dockerfile.dev` の COPY 追加
- [ ] Step 6: `scripts/generate-api-client.ts` を作り、`packages/api-client/schema.d.ts` を生成する
- [ ] Step 7: `biome.json` を作り、既存コードを含めて `pnpm format` を適用する
- [ ] Step 8: テストを実装する（test-spec.md に従う）
- [ ] Step 9: `.github/workflows/ci.yml` を作る
- [ ] Step 10: ローカル検証（typecheck / lint / test / generate:api-client --check / compose で api の起動確認）
