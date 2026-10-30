# Build 26: APIエラー形式・OpenAPI・クライアント生成 テストシナリオ

## AppError（apps/api/src/errors.ts）

### status: validation_error は 400 を返す
- 対応: —
- Given: `new AppError("validation_error", "入力が不正です")`
- When: `status` を読む
- Then: 400 が返る

### status: unauthorized は 401 を返す
- 対応: —
- Given: `new AppError("unauthorized", "ログインが必要です")`
- When: `status` を読む
- Then: 401 が返る

### status: forbidden は 403 を返す
- 対応: —
- Given: `new AppError("forbidden", "権限がありません")`
- When: `status` を読む
- Then: 403 が返る

### status: not_found は 404 を返す
- 対応: —
- Given: `new AppError("not_found", "見つかりません")`
- When: `status` を読む
- Then: 404 が返る

### status: conflict は 409 を返す
- 対応: —
- Given: `new AppError("conflict", "すでに存在します")`
- When: `status` を読む
- Then: 409 が返る

### status: internal_error は 500 を返す
- 対応: —
- Given: `new AppError("internal_error", "内部エラー")`
- When: `status` を読む
- Then: 500 が返る

### constructor: fields を省略すると空オブジェクトになる
- 対応: —
- Given: `new AppError("not_found", "見つかりません")`（第 3 引数なし）
- When: `fields` を読む
- Then: `{}` が返り、`code` は `"not_found"`、`message` は `"見つかりません"`、`instanceof Error` が真

### constructor: 指定した fields を保持する
- 対応: —
- Given: `new AppError("validation_error", "入力が不正です", { name: ["必須です"] })`
- When: `fields` を読む
- Then: `{ name: ["必須です"] }` が返る

## requestId ミドルウェア（apps/api/src/middleware/request-id.ts）

### requestId: 正しい形式の X-Request-Id をそのまま採用する
- 対応: —
- Given: `requestId` を適用したアプリ。`/health` へのリクエストにヘッダ `X-Request-Id: abc-123_4.5` を付ける
- When: リクエストを送る
- Then: 応答ヘッダ `X-Request-Id` が `abc-123_4.5` であり、ハンドラ内の `c.get("requestId")` も同じ値

### requestId: ヘッダが無ければ UUID を採番する
- 対応: —
- Given: `X-Request-Id` ヘッダを付けない `/health` へのリクエスト
- When: リクエストを送る
- Then: 応答ヘッダ `X-Request-Id` が UUID 形式（`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/`）である

### requestId: 採番した ID はリクエストごとに異なる
- 対応: —
- Given: `X-Request-Id` ヘッダなしの `/health` へのリクエスト 2 回
- When: 続けて送る
- Then: 2 つの応答の `X-Request-Id` が異なる

### requestId: 128 文字ちょうどの ID は受理する（境界値）
- 対応: —
- Given: `X-Request-Id: ` に `a` を 128 文字並べた値
- When: リクエストを送る
- Then: 応答の `X-Request-Id` が送った値と一致する

### requestId: 129 文字の ID は破棄して再採番する（境界値）
- 対応: —
- Given: `X-Request-Id` に `a` を 129 文字並べた値
- When: リクエストを送る
- Then: 応答の `X-Request-Id` が送った値と異なり、UUID 形式である

### requestId: 許可外の文字を含む ID は再採番する
- 対応: —
- Given: `X-Request-Id: abc def`（空白を含む）
- When: リクエストを送る
- Then: 応答の `X-Request-Id` が `abc def` ではなく UUID 形式である

### requestId: 記号を含む ID は再採番する
- 対応: —
- Given: `X-Request-Id: abc/../x;y`（`/` と `;` を含む）
- When: リクエストを送る
- Then: 応答の `X-Request-Id` が UUID 形式である

### requestId: 空文字の ID は再採番する（境界値）
- 対応: —
- Given: `X-Request-Id:` を空値で送る
- When: リクエストを送る
- Then: 応答の `X-Request-Id` が UUID 形式である

### requestId: 日本語など ASCII 外の文字を含む ID は再採番する
- 対応: —
- Given: `X-Request-Id: ａｂｃ`（全角英字）
- When: リクエストを送る
- Then: 応答の `X-Request-Id` が UUID 形式である

### requestId: エラー応答にも X-Request-Id ヘッダが付く
- 対応: —
- Given: `X-Request-Id: req-err-1` を付けて未定義パス `/no-such-path` へ GET する
- When: リクエストを送る
- Then: ステータス 404 で、応答ヘッダ `X-Request-Id` が `req-err-1`

## onError（apps/api/src/middleware/error-handler.ts）

### onError: AppError を共通形式と ERROR_STATUS のステータスで返す
- 対応: issue.md 受け入れ基準 1
- Given: `onError` を登録したアプリに、`throw new AppError("conflict", "すでに登録されています")` するルート `/boom-app`
- When: `/boom-app` へ GET する
- Then: ステータス 409。本文が `{ error: { code: "conflict", message: "すでに登録されています", fields: {} } }` に完全一致する

### onError: AppError の fields を応答に含める
- 対応: issue.md 受け入れ基準 1
- Given: `throw new AppError("validation_error", "入力が不正です", { email: ["形式が不正です"] })` するルート
- When: GET する
- Then: ステータス 400。`error.fields` が `{ email: ["形式が不正です"] }`

### onError: unauthorized の AppError が 401 で返る
- 対応: issue.md 受け入れ基準 1
- Given: `throw new AppError("unauthorized", "ログインが必要です")` するルート
- When: GET する
- Then: ステータス 401、`error.code` が `"unauthorized"`、`error.fields` が `{}`

### onError: forbidden の AppError が 403 で返る
- 対応: issue.md 受け入れ基準 1
- Given: `throw new AppError("forbidden", "権限がありません")` するルート
- When: GET する
- Then: ステータス 403、`error.code` が `"forbidden"`

### onError: not_found の AppError が 404 で返る
- 対応: issue.md 受け入れ基準 1
- Given: `throw new AppError("not_found", "投稿が見つかりません")` するルート
- When: GET する
- Then: ステータス 404、`error.code` が `"not_found"`

### onError: HTTPException 400 を validation_error に対応させる
- 対応: —
- Given: `throw new HTTPException(400, { message: "bad" })` するルート
- When: GET する
- Then: ステータス 400、`error.code` が `"validation_error"`、`error.fields` が `{}`

### onError: HTTPException 401 を unauthorized に対応させる
- 対応: —
- Given: `throw new HTTPException(401, { message: "no auth" })` するルート
- When: GET する
- Then: ステータス 401、`error.code` が `"unauthorized"`

### onError: HTTPException 403 を forbidden に対応させる
- 対応: —
- Given: `throw new HTTPException(403, { message: "denied" })` するルート
- When: GET する
- Then: ステータス 403、`error.code` が `"forbidden"`

### onError: HTTPException 404 を not_found に対応させる
- 対応: —
- Given: `throw new HTTPException(404, { message: "missing" })` するルート
- When: GET する
- Then: ステータス 404、`error.code` が `"not_found"`

### onError: HTTPException 409 を conflict に対応させる
- 対応: —
- Given: `throw new HTTPException(409, { message: "dup" })` するルート
- When: GET する
- Then: ステータス 409、`error.code` が `"conflict"`

### onError: ERROR_STATUS に無い 4xx（405）は validation_error に寄せ、ステータスは保つ
- 対応: —
- Given: `throw new HTTPException(405, { message: "method not allowed" })` するルート
- When: GET する
- Then: ステータス 405 のまま、`error.code` が `"validation_error"`、本文は共通形式

### onError: ERROR_STATUS に無い 4xx（413）は validation_error に寄せ、ステータスは保つ
- 対応: —
- Given: `throw new HTTPException(413, { message: "too large" })` するルート
- When: GET する
- Then: ステータス 413、`error.code` が `"validation_error"`

### onError: ERROR_STATUS に無い 4xx（422）は validation_error に寄せ、ステータスは保つ
- 対応: —
- Given: `throw new HTTPException(422, { message: "unprocessable" })` するルート
- When: GET する
- Then: ステータス 422、`error.code` が `"validation_error"`

### onError: HTTPException 500 は internal_error になる
- 対応: —
- Given: `throw new HTTPException(500, { message: "db password=secret" })` するルート
- When: GET する
- Then: ステータス 500、`error.code` が `"internal_error"`、本文に `"secret"` を含まない

### onError: 未対応の 5xx（503）は internal_error に寄せ、ステータスは保つ
- 対応: —
- Given: `throw new HTTPException(503, { message: "upstream down at 10.0.0.5" })` するルート
- When: GET する
- Then: ステータス 503、`error.code` が `"internal_error"`、本文に `"10.0.0.5"` を含まない

### onError: 想定外の例外は 500 internal_error の汎用メッセージで返す
- 対応: issue.md 受け入れ基準 1
- Given: `throw new Error("connect ECONNREFUSED postgres://user:pass@db:5432")` するルート
- When: GET する
- Then: ステータス 500、`error.code` が `"internal_error"`、`error.fields` が `{}`。`error.message` に例外メッセージ（`ECONNREFUSED`・`pass`）を含まない

### onError: 想定外の例外でスタックトレースを応答に含めない
- 対応: —
- Given: `throw new TypeError("x is undefined")` するルート
- When: GET する
- Then: 応答本文（文字列化したもの）に `"TypeError"`、`"x is undefined"`、`"at "` を含まない

### onError: Error 以外が throw されても 500 で返る
- 対応: —
- Given: `throw "plain string"`（文字列を throw）するルート
- When: GET する
- Then: ステータス 500、`error.code` が `"internal_error"`、本文に `"plain string"` を含まない

### onError: 想定外の例外の詳細は requestId 付きでサーバーログに出る
- 対応: —
- Given: エラーログ出力（`console.error` 等）をスパイし、`X-Request-Id: req-log-1` を付けて `throw new Error("secret detail")` するルートへ GET する
- When: リクエストを送る
- Then: ログ出力のいずれかに `req-log-1` と `secret detail` の両方が含まれ、応答本文には `secret detail` が含まれない

### onError: エラー応答の Content-Type は JSON
- 対応: issue.md 受け入れ基準 1
- Given: `throw new AppError("not_found", "見つかりません")` するルート
- When: GET する
- Then: 応答ヘッダ `Content-Type` が `application/json` で始まる

### errorBody: fields を省略すると空オブジェクトにする
- 対応: —
- Given: なし
- When: `errorBody("not_found", "見つかりません")` を呼ぶ
- Then: `{ error: { code: "not_found", message: "見つかりません", fields: {} } }` が返り、`errorResponseSchema.parse` が成功する

### errorBody: fields を指定するとそのまま含める
- 対応: —
- Given: なし
- When: `errorBody("validation_error", "入力が不正です", { "a.b.0": ["必須です"] })` を呼ぶ
- Then: `error.fields` が `{ "a.b.0": ["必須です"] }`

## notFoundHandler（apps/api/src/middleware/error-handler.ts）

### notFoundHandler: 未定義パスは 404 not_found を共通形式で返す
- 対応: issue.md 受け入れ基準 1
- Given: `createApp()` で作ったアプリ
- When: 未定義パス `GET /no-such-path` へリクエストする
- Then: ステータス 404。本文が `{ error: { code: "not_found", message: <文字列>, fields: {} } }` の形で、`errorResponseSchema.parse` が成功する

### notFoundHandler: 未定義パスへの POST も 404 not_found になる
- 対応: —
- Given: `createApp()` で作ったアプリ
- When: `POST /no-such-path` へ本文 `{}` を送る
- Then: ステータス 404、`error.code` が `"not_found"`

## validationHook（apps/api/src/middleware/error-handler.ts, openapi.ts の createRouter）

zod 検証の確認には、`createRouter()` で作ったテスト用ルーターに `body: { name: string, tags: string[], profile: { age: number } }` などを受ける `createRoute` の POST ルートを載せ、`onError` を登録したアプリを使う。

### validationHook: 必須フィールド欠落を 400 validation_error と fields で返す
- 対応: issue.md 受け入れ基準 1
- Given: `name`（string 必須）を持つ JSON ボディを受けるルート
- When: `Content-Type: application/json` で `{}` を POST する
- Then: ステータス 400、`error.code` が `"validation_error"`、`error.fields` のキーに `name` があり値は 1 件以上のメッセージ配列

### validationHook: 型不一致を fields に載せる
- 対応: issue.md 受け入れ基準 1
- Given: `name`（string）を持つ JSON ボディを受けるルート
- When: `{ "name": 123 }` を POST する
- Then: ステータス 400、`error.fields.name` が文字列配列で長さ 1 以上

### validationHook: ネストしたパスを a.b 形式のキーにする
- 対応: —
- Given: `profile.age`（number）を持つ JSON ボディを受けるルート
- When: `{ "name": "x", "tags": [], "profile": { "age": "abc" } }` を POST する
- Then: `error.fields` に `"profile.age"` キーが存在する

### validationHook: 配列要素のパスを a.0 形式のキーにする
- 対応: —
- Given: `tags`（string の配列）を持つ JSON ボディを受けるルート
- When: `{ "name": "x", "tags": ["ok", 5], "profile": { "age": 1 } }` を POST する
- Then: `error.fields` に `"tags.1"` キーが存在し、`"tags.0"` キーは存在しない

### validationHook: 複数フィールドの失敗をすべて fields に載せる
- 対応: —
- Given: `name` と `profile.age` が必須のルート
- When: `{}` を POST する
- Then: `error.fields` に `name` と `profile` 配下の失敗（`profile` など）の双方のキーが含まれる

### validationHook: 同じパスの複数メッセージは配列に集約する
- 対応: —
- Given: `name` に `min(3)` と `regex(/^[a-z]+$/)` の両方を課したルート
- When: `{ "name": "A1" }` を POST する
- Then: `error.fields.name` の配列長が 2 以上で、各要素が文字列

### validationHook: クエリパラメータの検証失敗も同じ形式で返す
- 対応: —
- Given: クエリ `limit`（整数、1 以上）を受けるルート
- When: `GET /items?limit=abc` を送る
- Then: ステータス 400、`error.code` が `"validation_error"`、`error.fields.limit` が存在する

### validationHook: パスパラメータの検証失敗も同じ形式で返す
- 対応: —
- Given: パス `/items/{id}` で `id` を UUID として検証するルート
- When: `GET /items/not-a-uuid` を送る
- Then: ステータス 400、`error.code` が `"validation_error"`、`error.fields.id` が存在する

### validationHook: 検証に成功した場合はハンドラに到達する
- 対応: —
- Given: `name`（string 必須）を持つ JSON ボディを受け、200 で `{ ok: true }` を返すルート
- When: `{ "name": "taro", "tags": [], "profile": { "age": 20 } }` を POST する
- Then: ステータス 200、本文 `{ ok: true }`。エラー形式にならない

### validationHook: 検証失敗の応答にも X-Request-Id が付く
- 対応: —
- Given: 上記ルートと `X-Request-Id: req-v-1`
- When: `{}` を POST する
- Then: ステータス 400、応答ヘッダ `X-Request-Id` が `req-v-1`

### validationHook: 不正な JSON ボディは 400 validation_error になる
- 対応: issue.md 受け入れ基準 1
- Given: JSON ボディを受けるテスト用ルート
- When: `Content-Type: application/json` で本文 `{"name": ` （途中で切れた JSON）を POST する
- Then: ステータス 400、`error.code` が `"validation_error"`、`error.fields` は `{}` または object、本文は `errorResponseSchema.parse` を通る。500 にならない

### validationHook: 空ボディの JSON リクエストは 400 になる
- 対応: —
- Given: JSON ボディ必須のルート
- When: `Content-Type: application/json` で本文なしに POST する
- Then: ステータス 400、`error.code` が `"validation_error"`

## /health（apps/api/src/app.ts）

### GET /health: 200 と { status: "ok" } を返す
- 対応: issue.md 受け入れ基準 2
- Given: `createApp()` で作ったアプリ
- When: `GET /health` を送る
- Then: ステータス 200、本文が `{ status: "ok" }` に完全一致する

### GET /health: DB なしで応答する
- 対応: —
- Given: `DATABASE_URL` が未設定の環境で `createApp()` を引数なしで呼ぶ
- When: `GET /health` を送る
- Then: ステータス 200（DB に触れない）

### GET /health: 応答に X-Request-Id が付く
- 対応: —
- Given: `createApp()` で作ったアプリ
- When: ヘッダなしで `GET /health` を送る
- Then: 応答ヘッダ `X-Request-Id` が UUID 形式

### POST /health: 定義されていないメソッドはエラー形式で返る
- 対応: —
- Given: `createApp()` で作ったアプリ
- When: `POST /health` を送る
- Then: ステータス 404。本文が共通のエラー形式で `error.code` が `"not_found"`

## /openapi.json（apps/api/src/app.ts）

### GET /openapi.json: OpenAPI 3.1 文書を返し /health を含む
- 対応: issue.md 受け入れ基準 2
- Given: `createApp()` で作ったアプリ
- When: `GET /openapi.json` を送る
- Then: ステータス 200、`Content-Type` が `application/json` で始まり、本文の `openapi` が `"3.1"` で始まり、`paths["/health"].get` が存在する

### GET /openapi.json: info が OPENAPI_INFO と一致する
- 対応: issue.md 受け入れ基準 2
- Given: `createApp()` で作ったアプリ
- When: `GET /openapi.json` を送る
- Then: 本文の `info.title` と `info.version` が `OPENAPI_INFO` の値と一致する

### GET /openapi.json: /health の 200 応答スキーマに status を持つ
- 対応: issue.md 受け入れ基準 2
- Given: `createApp()` で作ったアプリ
- When: `GET /openapi.json` の `paths["/health"].get.responses["200"]` を調べる
- Then: JSON スキーマに `status` プロパティが含まれる

### GET /openapi.json: 認証なしで取得できる
- 対応: —
- Given: Cookie も Authorization ヘッダも付けない
- When: `GET /openapi.json` を送る
- Then: ステータス 200（401 にならない）

### GET /openapi.json: 2 回目以降もキャッシュされた同一内容を返す
- 対応: —
- Given: `createApp()` で作ったアプリ
- When: `GET /openapi.json` を 2 回続けて送る
- Then: 2 つの応答本文が深く等しい

### GET /openapi.json: 文書の生成は初回のみで以降は再生成しない
- 対応: —
- Given: アプリの `getOpenAPI31Document` をスパイする
- When: `GET /openapi.json` を 3 回送る
- Then: `getOpenAPI31Document` の呼び出しが 1 回だけ

### GET /openapi.json: 応答に X-Request-Id が付く
- 対応: —
- Given: `createApp()` で作ったアプリ
- When: `X-Request-Id: req-doc-1` を付けて `GET /openapi.json` を送る
- Then: 応答ヘッダ `X-Request-Id` が `req-doc-1`

### GET /openapi.json: 仕様自体に機密情報を含まない
- 対応: —
- Given: `createApp()` で作ったアプリ
- When: `GET /openapi.json` の本文を文字列化する
- Then: `DATABASE_URL`、`password`、`secret` の語を含まない

## openapi.ts（apps/api/src/openapi.ts）

### errorResponses: 共通エラー応答の定義を備える
- 対応: issue.md 受け入れ基準 1
- Given: なし
- When: `errorResponses` のキーを調べる
- Then: `400`・`401`・`403`・`404`・`409`・`500` のキーがすべて存在し、各 content が `application/json` で `errorResponseSchema` を参照している

### createRouter: 検証失敗時の defaultHook が共通形式に変換する
- 対応: —
- Given: `createRouter()` で作ったルーターにボディ検証付きルートを載せ、`onError` は登録しない
- When: 不正なボディを POST する
- Then: ステータス 400、本文が `error.code === "validation_error"` を持つ共通形式（defaultHook だけで変換される）

## registerShutdown（apps/api/src/shutdown.ts）

テストでは `vi.useFakeTimers()` を使い、`exit` にモック、`server.close` にモックを渡し、`signals` には衝突を避けるため `process.emit` で発火させる。各テスト後にリスナーを解除する。

### registerShutdown: SIGTERM で server.close を呼ぶ
- 対応: —
- Given: `close(cb)` を記録するモック server と `exit` モック。`registerShutdown(server, { exit })` を呼ぶ
- When: `process.emit("SIGTERM")` する
- Then: `server.close` が 1 回呼ばれる

### registerShutdown: SIGINT で server.close を呼ぶ
- 対応: —
- Given: 同上
- When: `process.emit("SIGINT")` する
- Then: `server.close` が 1 回呼ばれる

### registerShutdown: close が成功したら exit(0) を呼ぶ
- 対応: —
- Given: `close` が `cb()`（エラーなし）を呼ぶモック server
- When: `SIGTERM` を発火する
- Then: `exit` が `0` で 1 回呼ばれる

### registerShutdown: close がエラーを返したら exit(1) を呼ぶ
- 対応: —
- Given: `close` が `cb(new Error("close failed"))` を呼ぶモック server
- When: `SIGTERM` を発火する
- Then: `exit` が `1` で 1 回呼ばれる

### registerShutdown: close が終わらないままタイムアウトしたら exit(1) を呼ぶ
- 対応: —
- Given: `close` が `cb` を呼ばないモック server。`timeoutMs: 5000`
- When: `SIGTERM` を発火し、タイマーを 5000ms 進める
- Then: `exit` が `1` で 1 回呼ばれる

### registerShutdown: タイムアウト直前はまだ exit を呼ばない（境界値）
- 対応: —
- Given: `close` が `cb` を呼ばないモック server。`timeoutMs: 5000`
- When: `SIGTERM` を発火し、タイマーを 4999ms 進める
- Then: `exit` は呼ばれていない

### registerShutdown: timeoutMs の既定値は 10000ms
- 対応: —
- Given: `close` が `cb` を呼ばないモック server。`timeoutMs` を指定しない
- When: `SIGTERM` を発火し、9999ms 進めてから 1ms 進める
- Then: 9999ms 時点では `exit` 未呼び出し、10000ms 到達で `exit(1)` が 1 回呼ばれる

### registerShutdown: close 成功後はタイムアウトで exit を重ねて呼ばない
- 対応: —
- Given: `close` が即座に `cb()` を呼ぶモック server。`timeoutMs: 5000`
- When: `SIGTERM` を発火して `exit(0)` を確認した後、タイマーを 5000ms 進める
- Then: `exit` の呼び出しは `0` の 1 回のみ

### registerShutdown: 二重発火を無視する（同じシグナル）
- 対応: —
- Given: `close` が `cb` を呼ばないモック server
- When: `SIGTERM` を 2 回続けて発火する
- Then: `server.close` の呼び出しが 1 回だけ

### registerShutdown: 二重発火を無視する（異なるシグナル）
- 対応: —
- Given: `close` が `cb` を呼ばないモック server
- When: `SIGTERM` の後に `SIGINT` を発火する
- Then: `server.close` の呼び出しが 1 回だけ

### registerShutdown: signals オプションで待ち受けるシグナルを変える
- 対応: —
- Given: `registerShutdown(server, { exit, signals: ["SIGUSR2"] })`
- When: `SIGTERM` を発火し、続けて `SIGUSR2` を発火する
- Then: `SIGTERM` では `server.close` が呼ばれず、`SIGUSR2` で 1 回呼ばれる

## index.ts（apps/api/src/index.ts）

### index: DATABASE_URL 未設定では起動時に例外で落ちる
- 対応: —
- Given: `DATABASE_URL` が未設定の環境
- When: `loadConfig()` を呼ぶ（`index.ts` が最初に実行する処理）
- Then: `"DATABASE_URL が設定されていません"` を含む例外が throw される

### index: PORT が不正なら起動時に例外で落ちる
- 対応: —
- Given: `DATABASE_URL=postgres://localhost/db`、`PORT=abc`
- When: `loadConfig()` を呼ぶ
- Then: `PORT は 1〜65535 の整数で指定してください` を含む例外が throw される

## generate-api-client（scripts/generate-api-client.ts）

スクリプトのテストは、出力先を一時ディレクトリに差し替えるか、実ファイルの内容を退避して復元する形で行う。実行は `pnpm generate:api-client` の形で行う。

### generate-api-client: 引数なしで schema.d.ts を生成する
- 対応: issue.md 受け入れ基準 3
- Given: `packages/api-client/schema.d.ts` が存在しない、または古い内容
- When: `pnpm generate:api-client` を実行する
- Then: 終了コード 0。`schema.d.ts` が書き出され、`"/health"` パスの定義を含む

### generate-api-client: --check で差分がなければ exit 0
- 対応: issue.md 受け入れ基準 3
- Given: 直前に `pnpm generate:api-client` で生成した最新の `schema.d.ts`
- When: `pnpm generate:api-client --check` を実行する
- Then: 終了コード 0。ファイルは変更されない

### generate-api-client: --check で差分があれば exit 1
- 対応: issue.md 受け入れ基準 3
- Given: `schema.d.ts` の末尾に `// stale` を 1 行足して古い状態にしてある
- When: `pnpm generate:api-client --check` を実行する
- Then: 終了コード 1。差分があることが標準出力または標準エラーに出力される

### generate-api-client: --check は差分があってもファイルを書き換えない
- 対応: issue.md 受け入れ基準 3
- Given: `schema.d.ts` の末尾に `// stale` を足した状態
- When: `pnpm generate:api-client --check` を実行する
- Then: 実行後も `schema.d.ts` の内容が `// stale` 付きのまま変わらない

### generate-api-client: --check は schema.d.ts が存在しない場合も exit 1
- 対応: issue.md 受け入れ基準 3
- Given: `schema.d.ts` を削除した状態
- When: `pnpm generate:api-client --check` を実行する
- Then: 終了コード 1。ファイルは作成されない

### generate-api-client: 生成結果は決定的で再実行しても同一
- 対応: issue.md 受け入れ基準 3
- Given: `pnpm generate:api-client` を実行済み
- When: もう一度 `pnpm generate:api-client` を実行して内容を比較する
- Then: 2 回の `schema.d.ts` の内容が一致する

### generate-api-client: 実行ディレクトリに依存せず同じ場所へ出力する
- 対応: —
- Given: リポジトリルート以外（例 `apps/api`）を cwd にしてスクリプトを直接実行する
- When: `tsx ../../scripts/generate-api-client.ts` を実行する
- Then: 出力先は常に `packages/api-client/schema.d.ts` で、`apps/api` 配下に余分なファイルが作られない

### generate-api-client: コミット済みの schema.d.ts が最新である
- 対応: issue.md 受け入れ基準 3
- Given: リポジトリにコミットされた `packages/api-client/schema.d.ts`
- When: `pnpm generate:api-client --check` を実行する
- Then: 終了コード 0（CI の `check` ジョブと同じ検証が通る）
