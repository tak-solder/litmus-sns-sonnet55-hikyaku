# Build 02: 共有パッケージ・Biome・CI 申し送り

## 後続ビルド向け

### 実装内容の要約

`packages/shared`（`@litmus-sns/shared`）を作り、定数・エラーコード・エラー応答スキーマを置いた。api は shared を import でき（`apps/api/src/shared.test.ts` で確認）、Biome（lint / format）を導入して既存コードに適用した。GitHub Actions の CI が、PR と main への push で typecheck / lint / マイグレーション検証 / test（実 PostgreSQL）を実行する。issue.md の受け入れ基準 2 件を満たす（CI の実行そのものは PR 上で確認する）。

### 公開インターフェース

- `@litmus-sns/shared`: `POST_BODY_MAX_LENGTH`(300) / `IMAGE_MAX_BYTES`(5MiB) / `FOLLOW_LIMIT`(5000) / `PAGE_SIZE_DEFAULT`(20) / `PAGE_SIZE_MAX`(20)
- `@litmus-sns/shared`: `ERROR_CODES`, `ErrorCode`, `ERROR_STATUS`（コード → HTTP ステータス）, `errorResponseSchema`, `ErrorResponse`（`{ error: { code, message, fields } }`。`fields` は必須で、無ければ `{}`）
- ルート scripts: `pnpm lint`（`biome check .`）, `pnpm format`（`biome check --write .`）, `pnpm test`（`pnpm -r test`）, `pnpm typecheck`
- build-26 が CI に OpenAPI 差分確認を足すときは、`.github/workflows/ci.yml` の `check` ジョブにステップを追加する

### 実装中の判断

- shared はビルドしないソース公開の内部パッケージ（`exports` が `./src/index.ts`）。api は tsx / vitest が直接読む。web が import するときは Next.js の `transpilePackages` が要る（build-15）
- api の `build` / `start` スクリプトを削除し、tsconfig を `noEmit` にした。shared のソースを `rootDir` の外から import するため、tsc での出力は成り立たない。本番イメージは build-24 でバンドルする
- Biome は Markdown・`docs/`・`.claude/`・`apps/web/public`・`apps/api/drizzle/meta`・`packages/api-client` を対象外にした。`docs/` を対象にすると設計ドキュメントが整形されてしまう
- CI の db は公式の postgres サービスコンテナではなく `docker compose up -d --build --wait db` で起動する（pg_bigm が要る）
- GitHub Actions は最新のタグのコミットハッシュで固定した（`actions/checkout` v7.0.1、`actions/setup-node` v7.1.0）。pnpm は `corepack enable` で `packageManager` に従う

### 環境変更

- 環境変数の追加は無い。CI は `DATABASE_URL`（マイグレーション）と `TEST_DATABASE_ADMIN_URL`（テスト）を step の env で渡す
- `pnpm-workspace.yaml` に `packages/*` を追加。`docker/Dockerfile.dev` に `packages/shared/package.json` の COPY を追加（新しい workspace パッケージを足すときは同様に追加する）
- 追加パッケージ: `zod`（shared）, `typescript`（shared の devDependencies）, `@biomejs/biome`（ルート）

### 意図的に残した未対応

- エラーハンドラ・リクエスト ID・OpenAPI・クライアント生成・CI の OpenAPI 差分確認は build-26
- DB 接続の配線は build-03
- コードレビュー（ラウンド 1・2）の指摘のうち次は不採用:
  - `build` / `start` の削除と shared のソース公開: 上記のとおり計画した判断で、本番の実行方式は build-24 で決める
  - `db` コンテナに `litmus_sns` が無い懸念: compose の `POSTGRES_DB` で作られる。手元で migrate が通ることを確認した
  - `tsbuildinfo` / `next-env.d.ts` の lint: web の typecheck 後に `pnpm lint` が通ることを確認した
  - shared のテストを `packages/shared` に置く案: issue.md の基準が「api から import できる」ことなので api 側に置いた
  - `db:generate` が生成をスキップした場合の判別: 推測の域を出ない
- ローカル検証のうち `curl` による `/health` の確認は、実行環境の制約でできなかった。compose のログで api の起動（マイグレーション適用と待ち受け）は確認した
- `security_review` は起動していない。認証・個人情報・決済に該当しない

## 昇格素材（close-cycle 向け）

### overview への影響

`packages/*` に shared が加わった。api / web が共有物を import する経路ができた（design-delta の「全体構成」どおり）。

### 新たな制約

- shared はソース公開のため、api の本番ビルドは tsc の出力ではなくバンドルで行う。web は `transpilePackages` が要る
- pg_bigm を使う CI は、公式の postgres サービスコンテナではなく自前の db イメージ（`docker/Dockerfile.db`）のビルドが要る

### 踏んだ落とし穴

- Biome 2 は既定で Markdown も整形する。`files.includes` で `docs` と `**/*.md` を外さないと、永続ドキュメントが書き換わる
- Biome は `.claude/worktrees/` 配下のコピーも走査する。`!.claude` で除外する

### 覆した設計判断

なし
