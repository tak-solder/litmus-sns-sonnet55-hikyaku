# Build 02: 共有パッケージ・Biome・CI テストシナリオ

issue.md の受け入れ基準 2 項目との対応は、シナリオ名の末尾に【基準N】で示す。

- 基準1: CI がプルリクエストで typecheck / lint / test を実行して通る（手動確認節）
- 基準2: `packages/shared` を api から import できる

自動テストは `apps/api/src/shared.test.ts`（vitest、api から `@litmus-sns/shared` を import する）に実装する。エラーハンドラ・OpenAPI・クライアント生成は build-26 の範囲のため含めない。

## packages/shared 定数

### constants: api から POST_BODY_MAX_LENGTH を import でき、300 である【基準2】
- 対応: —
- Given: `apps/api` の依存に `@litmus-sns/shared`（`workspace:*`）が追加されている
- When: `shared.test.ts` で `import { POST_BODY_MAX_LENGTH } from "@litmus-sns/shared"` して値を読む
- Then: import が解決でき（実行時エラーも型エラーもない）、値が 300 である

### constants: IMAGE_MAX_BYTES は 5MB（5242880）である
- 対応: —
- Given: なし
- When: `IMAGE_MAX_BYTES` を読む
- Then: 値が 5242880（`5 * 1024 * 1024`）である

### constants: FOLLOW_LIMIT は 5000 である
- 対応: —
- Given: なし
- When: `FOLLOW_LIMIT` を読む
- Then: 値が 5000 である

### constants: PAGE_SIZE_DEFAULT は 20 である
- 対応: —
- Given: なし
- When: `PAGE_SIZE_DEFAULT` を読む
- Then: 値が 20 である

### constants: PAGE_SIZE_MAX は 20 である
- 対応: —
- Given: なし
- When: `PAGE_SIZE_MAX` を読む
- Then: 値が 20 である

### constants: PAGE_SIZE_DEFAULT が PAGE_SIZE_MAX を超えない（境界）
- 対応: —
- Given: なし
- When: `PAGE_SIZE_DEFAULT` と `PAGE_SIZE_MAX` を比べる
- Then: `PAGE_SIZE_DEFAULT <= PAGE_SIZE_MAX` が成り立つ

### constants: すべての定数が正の整数である
- 対応: —
- Given: なし
- When: 5 つの定数それぞれを `Number.isInteger` と 0 との比較で検査する
- Then: すべて整数で 0 より大きい

## packages/shared エラー定義

### ERROR_CODES: 6 つのコードを過不足なく持つ
- 対応: —
- Given: なし
- When: `ERROR_CODES` の値の集合を読む
- Then: `validation_error` / `unauthorized` / `forbidden` / `not_found` / `conflict` / `internal_error` の 6 つで、他は含まない

### ERROR_STATUS: すべてのコードに設計どおりのステータスが対応する
- 対応: —
- Given: なし
- When: 各コードで `ERROR_STATUS` を引く
- Then: `validation_error` が 400、`unauthorized` が 401、`forbidden` が 403、`not_found` が 404、`conflict` が 409、`internal_error` が 500 である

### ERROR_STATUS: キーの集合が ERROR_CODES と一致する
- 対応: —
- Given: なし
- When: `Object.keys(ERROR_STATUS)` と `ERROR_CODES` の値を比べる
- Then: 要素数がともに 6 で、集合として等しい（過不足がない）

### errorResponseSchema: 正しい共通形式を受け入れる
- 対応: —
- Given: なし
- When: `{ error: { code: "conflict", message: "競合しました", fields: { email: ["使用済みです"] } } }` を `safeParse` する
- Then: `success` が true で、パース結果が入力と等しい

### errorResponseSchema: 空の fields を受け入れる（境界）
- 対応: —
- Given: なし
- When: `{ error: { code: "not_found", message: "なし", fields: {} } }` を `safeParse` する
- Then: `success` が true である

### errorResponseSchema: 複数フィールド・複数メッセージの fields を受け入れる
- 対応: —
- Given: なし
- When: `fields` が `{ name: ["必須です", "1文字以上で入力してください"], "profile.bio": ["10文字以内で入力してください"] }` の本文を `safeParse` する
- Then: `success` が true である

### errorResponseSchema: ERROR_CODES の 6 つすべての code を受け入れる
- 対応: —
- Given: なし
- When: 6 つのコードそれぞれで `{ error: { code, message: "x", fields: {} } }` を `safeParse` する
- Then: 6 件すべてで `success` が true である

### errorResponseSchema: fields の欠落を拒否する
- 対応: —
- Given: なし
- When: `{ error: { code: "not_found", message: "なし" } }` を `safeParse` する
- Then: `success` が false で、エラーのパスに `fields` が含まれる

### errorResponseSchema: 未定義のコードを拒否する
- 対応: —
- Given: なし
- When: `{ error: { code: "teapot", message: "x", fields: {} } }` を `safeParse` する
- Then: `success` が false である

### errorResponseSchema: message が文字列でないものを拒否する
- 対応: —
- Given: なし
- When: `{ error: { code: "forbidden", message: 123, fields: {} } }` を `safeParse` する
- Then: `success` が false である

### errorResponseSchema: message の欠落を拒否する
- 対応: —
- Given: なし
- When: `{ error: { code: "forbidden", fields: {} } }` を `safeParse` する
- Then: `success` が false で、エラーのパスに `message` が含まれる

### errorResponseSchema: fields の値が文字列配列でないものを拒否する
- 対応: —
- Given: なし
- When: `{ error: { code: "validation_error", message: "x", fields: { name: "必須です" } } }` を `safeParse` する
- Then: `success` が false である

### errorResponseSchema: fields の配列に文字列以外が含まれるものを拒否する
- 対応: —
- Given: なし
- When: `{ error: { code: "validation_error", message: "x", fields: { name: [1] } } }` を `safeParse` する
- Then: `success` が false である

### errorResponseSchema: error キーのない本文を拒否する
- 対応: —
- Given: なし
- When: `{ status: "ok" }` を `safeParse` する
- Then: `success` が false である

### errorResponseSchema: null と文字列を拒否する
- 対応: —
- Given: なし
- When: `null` と `"error"` をそれぞれ `safeParse` する
- Then: どちらも `success` が false である

## packages/shared の公開面

### index: 定数とエラー定義がすべて index から export されている【基準2】
- 対応: —
- Given: `shared.test.ts` が `@litmus-sns/shared` のみから import している
- When: `POST_BODY_MAX_LENGTH` / `IMAGE_MAX_BYTES` / `FOLLOW_LIMIT` / `PAGE_SIZE_DEFAULT` / `PAGE_SIZE_MAX` / `ERROR_CODES` / `ERROR_STATUS` / `errorResponseSchema` を参照する
- Then: すべて `undefined` でなく、`pnpm typecheck` で型エラーにならない

### index: ErrorCode 型が ERROR_CODES の値に限定される【基準2】
- 対応: —
- Given: `ErrorCode` 型を `@litmus-sns/shared` から import している
- When: `const ok: ErrorCode = "not_found"` と、`// @ts-expect-error` を付けた `const ng: ErrorCode = "teapot"` を書く
- Then: `pnpm typecheck` が成功する（`@ts-expect-error` が未使用になって失敗することもない）

## 手動確認（CI ワークフロー・ローカル検証）

自動テストの対象外。ワークフロー定義は `.github/workflows/ci.yml`。実行結果の確認は検証用ブランチから main への PR で行う。OpenAPI 差分確認のステップは build-26 が追加するため、ここでは存在しなくてよい。

### ci.yml: プルリクエストで typecheck / lint / test が実行されて通る【基準1】
- 対応: —
- Given: 本ビルドの変更を含むブランチから main へ PR を作る
- When: Actions の実行結果を見る
- Then: `pnpm typecheck`、`pnpm lint`、`pnpm test` のステップが実行され、すべて成功してジョブが緑になる。`pnpm test` には `shared.test.ts` が含まれる

### ci.yml: 起動条件が pull_request と main への push に限られる
- 対応: —
- Given: ワークフロー定義を開く
- When: `on:` を確認する
- Then: `pull_request` と `push`（`branches: [main]`）のみで、他のトリガーがない。PR のない feature ブランチへの push ではワークフローが起動しない

### ci.yml: 権限が contents: read のみである
- 対応: —
- Given: ワークフロー定義を開く
- When: `permissions` を確認する
- Then: トップレベルに `contents: read` のみが指定され、書き込み権限がない。ジョブ側で権限が上書きされていない

### ci.yml: 第三者アクションがコミット SHA で固定されている
- 対応: —
- Given: ワークフロー定義を開く
- When: すべての `uses:` を確認する
- Then: 各行が 40 桁の 16 進コミット SHA で固定されており（タグ名やブランチ名のみの指定がない）、元のバージョンが行末コメントで分かる

### ci.yml: ステップが設計どおりの順序で並ぶ
- 対応: —
- Given: ワークフロー定義を開く
- When: ステップの並びを確認する
- Then: `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm lint`、`docker compose up -d --build --wait db`、`pnpm --filter api migrate`、`pnpm --filter api db:generate` と `git diff --exit-code apps/api/drizzle`、`pnpm test` の順である

### ci.yml: db サービスが pg_bigm 入りで起動し、マイグレーションが空の DB に適用できる
- 対応: —
- Given: Actions の実行ログを開く
- When: `docker compose up -d --build --wait db` と `pnpm --filter api migrate` のログを確認する
- Then: db が healthy になり、migrate が `CREATE EXTENSION pg_bigm` を含めてエラーなく完了する

### ci.yml: lint 違反で CI が失敗する
- 対応: —
- Given: 検証用ブランチで、ダブルクォートをシングルクォートに変えたソースをコミットして PR を作る
- When: Actions の結果を見る
- Then: `pnpm lint` のステップで失敗し、後続の test は実行されない

### ci.yml: 型エラーで CI が失敗する
- 対応: —
- Given: 検証用ブランチで `const n: number = "a"` を含むコミットを PR にする
- When: Actions の結果を見る
- Then: `pnpm typecheck` のステップで失敗し、後続の lint 以降は実行されない

### ci.yml: shared の型エラーも typecheck で検出される
- 対応: —
- Given: 検証用ブランチで `packages/shared/src/constants.ts` に `export const X: number = "a"` を追加して PR にする
- When: Actions の結果を見る
- Then: `pnpm typecheck` のステップで失敗する（shared が typecheck 対象に含まれる）

### ci.yml: lockfile と package.json の不整合で CI が失敗する
- 対応: —
- Given: 検証用ブランチで `pnpm-lock.yaml` を更新せずに依存を `package.json` に追加して PR にする
- When: Actions の結果を見る
- Then: `pnpm install --frozen-lockfile` のステップで失敗する

### ci.yml: マイグレーションの生成漏れで CI が失敗する
- 対応: —
- Given: 検証用ブランチでスキーマ定義を変更し、`db:generate` の出力をコミットせずに PR にする
- When: Actions の結果を見る
- Then: `git diff --exit-code apps/api/drizzle` のステップで失敗する

### ci.yml: マイグレーションに差分がなければ生成漏れの検査を通る
- 対応: —
- Given: 本ビルドの変更のみ（スキーマ変更なし）の PR
- When: `db:generate` と `git diff --exit-code apps/api/drizzle` のログを確認する
- Then: 新しいマイグレーションが生成されず、`git diff --exit-code` が終了コード 0 で通る

### ローカル: pnpm format が既存コードの意味を変えない
- 対応: —
- Given: `pnpm install` 済みで、`pnpm format` を適用する前に `pnpm test` が通ることを確認している
- When: `pnpm format` を実行し、続けて `pnpm test` を実行する。あわせて `git diff` で変更内容を見る
- Then: `pnpm test` が適用前と同じ件数で全件成功する。差分は空白・引用符・import の並び替えなどの整形に限られ、ロジックや値の変更がない

### ローカル: pnpm format が冪等である
- 対応: —
- Given: `pnpm format` を 1 回適用済み
- When: もう一度 `pnpm format` を実行する
- Then: 追加の差分が出ない（`git diff` が前回と同一）

### ローカル: pnpm lint / typecheck / test がクリーンな状態で通る【基準1】
- 対応: —
- Given: `pnpm install` 済みで、`pnpm format` を適用した状態
- When: `pnpm lint`、`pnpm typecheck`、`pnpm test` を順に実行する
- Then: すべて終了コード 0 になる

### ローカル: lint の除外対象が lint されない
- 対応: —
- Given: `.next`、`apps/api/drizzle/meta`、`packages/api-client`、`pnpm-lock.yaml` に Biome の規則に違反する内容がある（または空ファイルを置く）
- When: `pnpm lint` を実行する
- Then: これらに対する指摘が出ない

### ローカル: lint 違反を検出する
- 対応: —
- Given: `apps/api/src` のソースでダブルクォートをシングルクォートに書き換える
- When: `pnpm lint` を実行する
- Then: 終了コードが 0 以外になり、該当ファイルが指摘される。元に戻すと終了コード 0 に戻る

### ローカル: docker compose で api が起動し /health が応答する
- 対応: —
- Given: `docker/Dockerfile.dev` に `packages/shared/package.json` の COPY が追加されている
- When: `docker compose up --build` で api を起動し、`curl -i localhost:<api ポート>/health` を実行する
- Then: ビルドが成功し、api コンテナが起動して `/health` が 200 と `{"status":"ok"}` を返す。`@litmus-sns/shared` の解決エラーがログに出ない

### ローカル: Dockerfile.dev の COPY を欠くとビルドまたは起動が失敗する
- 対応: —
- Given: `Dockerfile.dev` から `packages/shared/package.json` の COPY 行を一時的に外す
- When: `docker compose build api` を実行する
- Then: `pnpm install --frozen-lockfile` が失敗するか、起動時に shared を解決できずエラーになる。COPY を戻すと成功する（COPY の必要性の確認。確認後は必ず元に戻す）
