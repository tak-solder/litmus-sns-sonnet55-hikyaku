# Build 23: インフラ: ネットワーク・DB・ECS 申し送り

## 後続ビルド向け

### 実装内容の要約

`infra/`（AWS CDK, TypeScript）に本番構成のうち、ネットワーク・DB・ECS の部分を作った。4 スタック構成で、`LitmusNetwork`（VPC 2 AZ・NAT 1 つ）、`LitmusEcr`（web / api のリポジトリ）、`LitmusDatabase`（RDS PostgreSQL 17、Multi-AZ）、`LitmusService`（ECS Fargate の web / api、ALB、オートスケール）から成る。issue.md の受け入れ基準のうち、`cdk synth` とスナップショットテスト、2 タスク以上かつ 2 AZ 分散、RDS の Multi-AZ、Secrets Manager 経由の秘密情報の 4 件を満たす。「本番用 Dockerfile」は build-27 に分割した（G6）。

### 公開インターフェース

- `cdk synth -c imageTag=<commit SHA>` — `imageTag` は必須で既定値は無い（ECR のタグが不変なので）。他の context は `region`（既定 `ap-northeast-1`）、`webDesiredCount` / `apiDesiredCount`（既定 2、2 未満はエラー）、`maxTaskCount`（既定 6）、`dbInstanceClass`（既定 `t4g.medium`）、`apiPathPattern`（既定 `/api/*`）
- `infra/lib/config.ts`: `loadConfig(app): EnvConfig`
- `ServiceStack` は `cluster` / `webService` / `apiService` / `alb` を公開する。build-24 が IAM 権限（S3・SES・CloudFront 無効化）を api のタスクロールに足すときは、`apiService.taskDefinition.taskRole` を使う
- api のコンテナへの注入: secrets は `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME`（RDS が生成した Secret の JSON フィールド）、環境変数は `PORT`（api 8080、web 3000）だけ。`apps/api` が読む `DATABASE_URL` は未対応で、build-24 が組み立てる
- ルート scripts: `pnpm --filter infra test` / `typecheck` / `synth`

### 実装中の判断

- DB の 5432 の許可は `ServiceStack` の `CfnSecurityGroupIngress` で足す。`addIngressRule` だとルールが `DatabaseStack` に置かれ、スタック間の循環参照になる
- 秘密情報は RDS が生成する Secret（`fromGeneratedSecret("app")`）だけ。アプリ用の署名鍵は要らない（セッションは DB に保存する不透明トークンのハッシュ方式）
- ECR は IMMUTABLE で、ライフサイクルは未タグを 1 日で削除、最新 30 件を保持
- ECS サービスは `circuitBreaker: { rollback: true }`、`minHealthyPercent` 100・`maxHealthyPercent` 200、オートスケールは CPU 60% 目標で最小 = desiredCount、最大 = `maxTaskCount`
- パラメータグループは postgres17 family で `rds.force_ssl=1` だけ。`shared_preload_libraries` に pg_bigm は入れない（G8 で委任された判断）。pg_bigm は build-01 のマイグレーション（`CREATE EXTENSION IF NOT EXISTS pg_bigm`）で有効にする

### 環境変更

- 新しい workspace パッケージ `infra`（`pnpm-workspace.yaml`、`docker/Dockerfile.dev` の COPY、`.gitignore` と `biome.json` の `cdk.out`）
- 追加パッケージ（`infra`）: `aws-cdk-lib`, `constructs`, `aws-cdk`, `tsx`, `typescript`, `vitest`, `@types/node`
- 環境変数・マイグレーションの追加は無い

### 意図的に残した未対応

コードレビュー・セキュリティレビュー（ラウンド 1・2）の指摘のうち、次は「そのまま進める」とした。後続ビルドに申し送る分は issue.md に追記済み（委任された判断）。

- 後続ビルドで扱う（issue.md に追記済み）
  - ALB が 0.0.0.0/0 の HTTP:80 で公開される。CloudFront 経由への制限は build-24
  - api の DB 接続の SSL（`sslmode` と RDS CA バンドル）は build-24。`rds.force_ssl=1` なので、設定が漏れると api が起動直後に落ち続ける
  - ALB が `/api/*` をパス書き換えなしで api に転送する。api のルートは `/api` 付きではないので、build-24 で書き換えかプレフィックスを決める
  - CD は commit SHA の `imageTag` を `-c` で渡す（build-24）
  - 初回デプロイは ECR → イメージ push → 残りの順（build-24 の手順書）
  - web のヘルスチェックは `/`。`/` が 3xx を返すと unhealthy になるので、build-15 で専用パスを作り、build-24 で ALB の設定を合わせる
- このサイクルでは扱わない
  - desiredCount を固定したままオートスケールを併用している。再デプロイのたびにタスク数が desiredCount に戻る。受け入れ基準（各 2 タスク以上、2 AZ 分散）を初回から満たすために残した。運用で問題になれば desiredCount を省く
  - マイグレーションと実行で同じ DB ユーザー（`app`）を使う。ユーザーの分離と Secret のローテーションは MVP 後の課題
  - タスクの egress が全開放。NAT 1 つという費用方針とのトレードオフ（VPC エンドポイントで絞る案は MVP 後）
  - ロググループは RETAIN のまま。ログを残す意図
- 未検証
  - RDS PostgreSQL 17 が pg_bigm 拡張をサポートし、`CREATE EXTENSION` だけで使えるか。調査用の WebSearch が承認されず確認できていない。デプロイ時に判明する（ADR `search-pg-bigm` のトレードオフ欄の確認事項のまま）
  - `docker compose build` での `Dockerfile.dev` の COPY 追加の動作確認。`pnpm install --frozen-lockfile` が通ることは確認した
- ローカル検証のうち、`pnpm test` の api は PostgreSQL が起動していない環境のため失敗した（`ECONNREFUSED 127.0.0.1:5432`）。このビルドの変更とは無関係。infra のテスト（45 件）は通った
- BP: builder で Dockerfile を含めて再算出すると 8 だったため build-27 に分割した（G6）。build-24 は申し送りの追記で作業が増えるので、着手時に BP を見直す

## 昇格素材（close-cycle 向け）

### overview への影響

`infra/` が加わった。本番構成の ECS・RDS・ALB・ECR・VPC がコードになった（design-delta の「本番構成」どおり）。S3・CloudFront・SES とデプロイ CI は build-24、イメージは build-27 で作る。

### 新たな制約

- `cdk synth` / `cdk deploy` には `-c imageTag=<commit SHA>` が必須（ECR のタグが不変）
- web / api は各 2 タスク以上（`webDesiredCount` / `apiDesiredCount` が 2 未満の設定は合成時にエラー）
- 初回のデプロイは ECR スタック → イメージ push → 残りの順（空のリポジトリではタスクが起動しない）

### 踏んだ落とし穴

- CDK の `SecurityGroup.addIngressRule` に別スタックの SG をピアとして渡すと、ルールが DB 側のスタックに置かれ、`DependencyCycle` で synth が失敗する。ルールを使う側のスタックで `CfnSecurityGroupIngress` を明示的に作る
- CloudFormation のセキュリティグループの説明は ASCII の限られた文字だけで、日本語を入れると検証の警告が出る

### 覆した設計判断

なし
