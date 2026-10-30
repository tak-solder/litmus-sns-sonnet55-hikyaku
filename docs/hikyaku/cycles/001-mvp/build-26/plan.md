# Build 26: APIエラー形式・OpenAPI・クライアント生成

## 依存パッケージ

| パッケージ | 用途 | 備考 |
|-----------|------|------|
| `@hono/zod-openapi` | OpenAPI ルート定義・zod 検証・仕様出力（apps/api） | 新規追加。zod 4 対応版（1.x 系）を選ぶ。`hono` は現状の 4.13.0 固定を維持し、peer が合わなければ報告する |
| `openapi-typescript` | 仕様から `schema.d.ts` を生成（ルート devDependencies） | 新規追加。スクリプトが `scripts/` に置かれ、ルートから解決させるためルートに入れる |

追加は `add-library` の方針（パッケージマネージャー経由、ライセンス確認、`pnpm install --frozen-lockfile` が通ること）に従う。

## クラス設計

`apps/api/src/errors.ts`

```ts
import type { ErrorCode } from "@litmus-sns/shared";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fields: Record<string, string[]>;
  constructor(code: ErrorCode, message: string, fields?: Record<string, string[]>);
  get status(): number; // ERROR_STATUS[code]
}
```

`apps/api/src/middleware/request-id.ts`

```ts
export type RequestIdEnv = { Variables: { requestId: string } };
export const REQUEST_ID_HEADER = "X-Request-Id";
// 受け取った値が /^[\w.-]{1,128}$/ ならそのまま、そうでなければ randomUUID() を採番する。
// c.set("requestId") と応答ヘッダに載せる。
export const requestId: MiddlewareHandler<RequestIdEnv>;
```

`apps/api/src/middleware/error-handler.ts`

```ts
export function errorBody(code: ErrorCode, message: string, fields?: Record<string, string[]>): ErrorResponse;
export const onError: ErrorHandler<RequestIdEnv>;   // AppError / HTTPException / その他
// HTTPException は status を ErrorCode に対応させる（400→validation_error / 401→unauthorized / 403→forbidden /
// 404→not_found / 409→conflict）。ERROR_STATUS に無い status（405・413・422 など）は、
// 4xx なら validation_error、5xx なら internal_error の code に寄せる。HTTP ステータスは元の値を保つ。
export const notFoundHandler: NotFoundHandler<RequestIdEnv>;
export const validationHook: Hook<unknown, RequestIdEnv, string, unknown>; // zod 検証失敗 → validation_error
```

`apps/api/src/openapi.ts`

```ts
export function createRouter(): OpenAPIHono<RequestIdEnv>; // defaultHook に validationHook を設定
export const errorResponses: Record<400 | 401 | 403 | 404 | 409 | 500, ...>; // 業務ルートが使う共通のエラー応答定義（errorResponseSchema）
export const OPENAPI_INFO: { title: string; version: string };
```

`apps/api/src/app.ts`（差分）

```ts
export function createApp(): OpenAPIHono<RequestIdEnv>;
// requestId → ルート（/health）→ GET /openapi.json。onError / notFound を登録
// /openapi.json は公開を前提とする。doc31 はリクエストごとに文書を生成しうるため使わず、
// 自前ハンドラで初回に getOpenAPI31Document(OPENAPI_INFO) を生成してモジュール内に保持し、以降はそれを返す。
export const app = createApp();
```

`/health` は `createRoute` で定義し、応答は従来どおり `{ status: "ok" }`。DB は触らない（build-03 で `createApp` の引数に DB を足す）。

`apps/api/src/shutdown.ts`

```ts
export function registerShutdown(server: { close(cb: (err?: Error) => void): unknown }, options?: { timeoutMs?: number; exit?: (code: number) => void; signals?: NodeJS.Signals[] }): void;
// SIGTERM / SIGINT で server.close。完了で exit(0)、エラーで exit(1)。timeoutMs（既定 10_000）を超えたら exit(1)。二重発火は無視する
```

`apps/api/src/index.ts`（差分）: `loadConfig()` の `port` で `serve` し、返った server を `registerShutdown` に渡す。設定の不足は起動時の例外として落とす。

`scripts/generate-api-client.ts`

```ts
// createApp().getOpenAPI31Document(OPENAPI_INFO) → openapi-typescript → packages/api-client/schema.d.ts
// --check: 生成結果と既存ファイルを比較し、差があれば差分の有無を出力して exit 1（ファイルは書かない）
```

ルート `package.json` に `"generate:api-client": "pnpm --filter api exec tsx ../../scripts/generate-api-client.ts"` を追加する。`--check` は `pnpm generate:api-client --check` の形で渡す（CI も同じ表記）。出力先 `packages/api-client/schema.d.ts` は cwd に依存させず、スクリプト自身の位置（`import.meta.url`）を基準に解決する。`apps/api/tsconfig.json` の `include` に `../../scripts` を足して typecheck の対象にする。

CI（`.github/workflows/ci.yml` の `check` ジョブ）に、`pnpm typecheck` の後へ `pnpm generate:api-client --check` のステップを追加する。

## 非機能要件

- **セキュリティ**: 500 の応答に例外メッセージ・スタックを含めない（汎用メッセージのみ）。詳細はサーバーログに `requestId` 付きで出す。リクエスト ID は長さと文字種を制限し、ログ・ヘッダへの注入を防ぐ。`/openapi.json` は公開情報のみで認証情報を含まない
- **パフォーマンス**: 仕様ドキュメントはリクエストごとに生成せず、初回生成した結果を保持して返す（`app.ts` の方針を参照）
- **エラーハンドリング**: すべてのエラーを `{ error: { code, message, fields } }`（`fields` は無ければ `{}`）で返す。HTTP ステータスは shared の `ERROR_STATUS` に従う。zod 検証失敗は 400 `validation_error` で、`fields` はパス（`a.b.0`）をキー、メッセージ配列を値にする。不正な JSON ボディも 400。未定義パスは 404 `not_found`。想定外の例外は 500 `internal_error`
- **マージ時点のデータ安全**: DB・マイグレーション・保存形式に触れず、データは壊れない。公開 API は `/health`（応答形式を維持）と新設の `/openapi.json`（公開前提）のみで、既存の呼び出し元はない。挙動変更が 1 つある。`index.ts` が `loadConfig` を使うため、`DATABASE_URL` 未設定では起動が失敗する（従来は `PORT` だけで起動できた）。DB 接続自体は build-03 まで配線しない。`compose.yaml` と CI は `DATABASE_URL` を渡しているので影響しない

## BP見積もり

| 段階 | BP |
|------|----|
| architectフェーズ段階 | 5BP |
| builderフェーズ段階 | 7BP |

**作成するファイル**

- `apps/api/src/errors.ts`（約 30 行）
- `apps/api/src/middleware/request-id.ts`（約 25 行）
- `apps/api/src/middleware/error-handler.ts`（約 90 行）
- `apps/api/src/openapi.ts`（約 40 行）
- `apps/api/src/shutdown.ts`（約 40 行）
- `scripts/generate-api-client.ts`（約 50 行）
- `apps/api/src/app.test.ts`（約 90 行）
- `apps/api/src/middleware/error-handler.test.ts`（約 100 行）
- `apps/api/src/shutdown.test.ts`（約 60 行）
- `packages/api-client/schema.d.ts`（生成物）

既存ファイルの変更: `apps/api/src/app.ts`, `apps/api/src/index.ts`, `apps/api/package.json`, `apps/api/tsconfig.json`, `package.json`, `.github/workflows/ci.yml`（lockfile は生成物）。

**builderフェーズ段階の内訳**

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 10 | 3（ベース） |
| 実装行数（テスト含む） | 525 | 3 |
| API操作数 | 未指定 | — |
| 画面/ページ数 | 未指定 | — |
| DBテーブル/エンティティ数 | 未指定 | — |
| ベースBP（指標の最大値） | — | 3 |
| 影響ファイル数 | 9 | +3 |
| 基盤セットアップを含む | あり | +1 |
| 外部API連携を含む | 未指定 | +0 |
| 既存コードの大規模リファクタ | 未指定 | +0 |
| **合計** | — | **7BP** |

影響ファイル数 9 は、変更する 6 件に加え、読んで影響を確認する `packages/shared/src/errors.ts`・`packages/shared/src/index.ts`・`apps/api/src/config.ts` を含めた数（`biome.json`・`compose.yaml`・build-02 の handoff.md は確認のみで数に入れない）。

7BP は `bpMax − 2`（6）以上のため分割を検討したが、**分割せずに続行する**（監督判断）。`shutdown.ts` と `loadConfig` 化を切り出しても build-26 は 7BP のまま（新規 8 ファイル、約 425 行、影響 8 ファイル）で、切り出した側は 1BP にしかならない。BP が下がらないまま PR とセッションだけが増える。上限 8 の範囲内で、データ安全上の問題もない（開発基盤とエラー形式の追加のみ）。issue.md の見積もり（5BP）は architect 段階の値のまま残し、tasklist.md も変更しない。

## 実装ステップ

- [ ] Step 1: 依存パッケージを追加する（`@hono/zod-openapi`、`openapi-typescript`）
- [ ] Step 2: `errors.ts`、`request-id.ts`、`error-handler.ts` を実装する
- [ ] Step 3: `openapi.ts`、`app.ts`（`createApp`、`/health`、`/openapi.json`）を実装する
- [ ] Step 4: `shutdown.ts` と `index.ts`（`loadConfig` 利用）を実装する
- [ ] Step 5: `scripts/generate-api-client.ts` とルート script を実装し、`schema.d.ts` を生成する
- [ ] Step 6: テスト（`app.test.ts`、`error-handler.test.ts`、`shutdown.test.ts`）を実装する
- [ ] Step 7: CI に `generate:api-client --check` を追加する
- [ ] Step 8: ローカル検証（typecheck / lint / test / generate:api-client --check）
