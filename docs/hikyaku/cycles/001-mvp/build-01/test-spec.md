# Build 01: ローカル環境とDB基盤 テストシナリオ

受け入れ基準の番号は issue.md の「受け入れ基準」の並び順に従う。

1. `docker compose up` で web / api / db / mailpit / minio がすべて起動する
2. `pnpm --filter api` のマイグレーション実行で空の DB に拡張が入る
3. DB を使うテストが `docker compose` の `db` に対して通る
4. Mailpit の UI と MinIO のコンソールに、README 未整備でも compose の定義から到達できる

## loadConfig

### loadConfig: DATABASE_URL と PORT を指定した場合は指定値を返す
- 対応: —
- Given: env が `{ DATABASE_URL: "postgres://postgres:postgres@localhost:5432/app", PORT: "3000" }`
- When: `loadConfig(env)` を呼ぶ
- Then: `{ databaseUrl: "postgres://postgres:postgres@localhost:5432/app", port: 3000 }` が返り、`port` は数値型である

### loadConfig: PORT 未指定なら既定値 8080 を使う
- 対応: —
- Given: env が `{ DATABASE_URL: "postgres://postgres:postgres@localhost:5432/app" }`（PORT なし）
- When: `loadConfig(env)` を呼ぶ
- Then: `port` が `8080` になる（既存の `index.ts` の既定値と一致する）

### loadConfig: DATABASE_URL が無ければ明示的なメッセージで例外にする
- 対応: —
- Given: env が `{ PORT: "3000" }`（DATABASE_URL なし）
- When: `loadConfig(env)` を呼ぶ
- Then: 例外が投げられ、メッセージに `DATABASE_URL` が含まれる

### loadConfig: DATABASE_URL が空文字なら例外にする
- 対応: —
- Given: env が `{ DATABASE_URL: "" }`
- When: `loadConfig(env)` を呼ぶ
- Then: 未設定と同じく `DATABASE_URL` を示すメッセージで例外が投げられる

### loadConfig: PORT が数値でない場合は例外にする
- 対応: —
- Given: env が `{ DATABASE_URL: "postgres://postgres:postgres@localhost:5432/app", PORT: "abc" }`
- When: `loadConfig(env)` を呼ぶ
- Then: `NaN` の port を返さず、PORT が不正である旨のメッセージで例外が投げられる

### loadConfig: PORT が 1〜65535 の整数でなければ例外にする（境界値）
- 対応: —
- Given: 有効な DATABASE_URL と、PORT が `"0"`・`"65536"`・`"-1"`・`"3000abc"`・`""` のそれぞれ
- When: 各 env で `loadConfig(env)` を呼ぶ
- Then: すべて例外が投げられる。PORT が `"1"` と `"65535"` なら例外にならず数値で返る

## createDb

### createDb: 接続できる db と pool を返し、SQL を実行できる
- 対応: 受け入れ基準3
- Given: 起動中の `db` を指す有効な DATABASE_URL
- When: `createDb(url)` を呼び、`db.execute(sql\`select 1 as v\`)` を実行する
- Then: 結果の先頭行の `v` が `1` になる。テスト終了時に `pool.end()` が正常に完了する

### createDb: 到達できない接続先では実行時にエラーになる
- 対応: —
- Given: 接続できないポートを指す DATABASE_URL（`postgres://postgres:postgres@localhost:1/none`）
- When: `createDb(url)` を呼び、`db.execute(sql\`select 1\`)` を実行する
- Then: `createDb` 自体は例外を投げず、クエリ実行が接続エラーで reject される

## runMigrations

### runMigrations: 空の DB に pg_bigm 拡張が入る
- 対応: 受け入れ基準2
- Given: 拡張が一つも入っていない空のデータベース
- When: `runMigrations(url)` を実行し、`select extname from pg_extension where extname = 'pg_bigm'` を問い合わせる
- Then: 1 行返り、`extname` が `pg_bigm` である

### runMigrations: 2 回続けて実行しても成功する（冪等）
- 対応: 受け入れ基準2
- Given: すでに `runMigrations` を 1 回適用済みのデータベース
- When: 同じ URL で `runMigrations(url)` を再度実行する
- Then: 例外は投げられず、`pg_bigm` 拡張が引き続き 1 つだけ存在する（api の起動のたびに実行しても壊れない）

### runMigrations: 業務テーブルを作らない
- 対応: 受け入れ基準2
- Given: 空のデータベース
- When: `runMigrations(url)` を実行し、`public` スキーマのテーブルを `information_schema.tables` から取得する
- Then: 0 件である（Drizzle の管理テーブルは既定で `drizzle` スキーマに入るため `public` には現れない）

### runMigrations: 接続できない DB に対しては reject する
- 対応: 受け入れ基準1（マイグレーション失敗時に api を起動させない前提）
- Given: 接続できないポートを指す DATABASE_URL（`postgres://postgres:postgres@localhost:1/none`）
- When: `runMigrations(url)` を呼ぶ
- Then: Promise が reject される（握りつぶして正常終了しない）

## createTestDatabase

### createTestDatabase: マイグレーション済みの一意名 DB を作成する
- 対応: 受け入れ基準3
- Given: `TEST_DATABASE_ADMIN_URL` 未設定（既定の `postgres://postgres:postgres@localhost:5432/postgres`）で、compose の `db` が起動している
- When: `createTestDatabase()` を 2 回呼び、それぞれの `db` で `select current_database() as name` と `pg_bigm` 拡張の有無を問い合わせる
- Then: 2 つの DB 名が異なり、どちらも `pg_bigm` 拡張が入っている。`url` はそれぞれの DB 名を指す

### createTestDatabase: drop() で DB が削除される
- 対応: 受け入れ基準3
- Given: `createTestDatabase()` で作成した `TestDatabase`
- When: `drop()` を実行し、管理用接続で `select 1 from pg_database where datname = $1` に作成した DB 名を渡して問い合わせる
- Then: 該当行が 0 件である

### createTestDatabase: drop() を 2 回続けて呼んでも reject されない
- 対応: —
- Given: `createTestDatabase()` で作成した `TestDatabase`
- When: `drop()` を 2 回続けて呼ぶ
- Then: 2 回目も reject されない（afterAll の二重呼び出しで失敗しない）

### createTestDatabase: TEST_DATABASE_ADMIN_URL で管理 URL を上書きでき、到達不能なら reject する
- 対応: 受け入れ基準3
- Given: `TEST_DATABASE_ADMIN_URL` に有効な URL を設定した場合と、`postgres://postgres:postgres@localhost:1/postgres` を設定した場合
- When: それぞれ `createTestDatabase()` を呼ぶ
- Then: 前者は指定した管理 URL でテスト DB を作成して返し、後者は reject される

## 手動確認

compose の起動や外部サービスへの到達は自動テストの対象外とし、`docker compose up` を実行したうえで次を確認する。

### compose 起動: 全サービスが 1 コマンドで起動する
- 対応: 受け入れ基準1
- 手順: クリーンな状態で `docker compose up` を実行し、`docker compose ps` を確認する
- 期待結果: web / api / db / mailpit / minio がすべて running で、db は healthy になっている。api は db が healthy になってから起動し、起動前にマイグレーションが適用される

### マイグレーション失敗時: api が起動しない
- 対応: 受け入れ基準1
- 手順: api の `DATABASE_URL` を不正な値にして `docker compose up api` を実行する
- 期待結果: `migrate` が非ゼロで終了し、api のサーバーは起動しない

### migrate スクリプトを直接実行する
- 対応: 受け入れ基準2
- 手順: 空の DB に対して `DATABASE_URL=<空DBのURL> pnpm --filter api migrate` を実行する。続けて `DATABASE_URL` を未設定、または不正な値にして同じコマンドを実行する
- 期待結果: 前者は終了コード 0 で `pg_bigm` が入る。後者は非ゼロで終了する

### 公開ポートが 127.0.0.1 に限られる
- 対応: 受け入れ基準1
- 手順: `docker compose ps` で公開ポートを確認する
- 期待結果: db(5432)・mailpit(8025, 1025)・minio(9000, 9001) がすべて `127.0.0.1:` にバインドされている

### db: pg_bigm が使える
- 対応: 受け入れ基準2
- 手順: `docker compose exec db psql -U postgres -c "select extname from pg_extension"` を実行する
- 期待結果: api 起動後の対象 DB に `pg_bigm` が含まれる

### api の `/health` が従来どおり応答する
- 対応: 受け入れ基準1
- 手順: `curl http://localhost:8080/health` を実行する
- 期待結果: 変更前と同じ正常応答が返る

### Mailpit の UI に到達できる
- 対応: 受け入れ基準4
- 手順: compose.yaml の `mailpit` のポート定義を読み、ブラウザで `http://localhost:8025` を開く。SMTP ポート 1025 への接続も確認する
- 期待結果: Mailpit の画面が表示される。README を読まなくても compose.yaml の定義だけで URL が分かる

### MinIO のコンソールに到達できる
- 対応: 受け入れ基準4
- 手順: compose.yaml の `minio` のポート定義を読み、ブラウザで `http://localhost:9001` を開く。API ポート 9000 の到達も確認する
- 期待結果: MinIO のコンソールのログイン画面が表示され、`.env.example` の認証情報でログインできる

### DB テストが compose の db に対して通る
- 対応: 受け入れ基準3
- 手順: `docker compose up db` のみ起動した状態で `pnpm --filter api test` を実行する
- 期待結果: すべてのテストが成功し、実行後にテスト用 DB が残らない
