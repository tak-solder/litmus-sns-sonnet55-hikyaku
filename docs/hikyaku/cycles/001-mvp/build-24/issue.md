# Build 24: インフラ: S3・CloudFront・SES・デプロイCI

## やること

- S3 バケット（`pending/` は配信しない、`images/` のみ CloudFront から配信）、CloudFront ディストリビューション（web と api の前段。ゲストの単体ページのキャッシュポリシー、セッションクッキーをキャッシュキーに含める設定、画像配信の設定）、SES（送信ドメイン・送信権限）を CDK でコード化する
- CloudFront の無効化を api タスクに許す IAM 権限と、api の S3 / SES 権限を足す
- GitHub Actions の CD を作る。main へのマージで、build-27 の `docker/Dockerfile.api` / `docker/Dockerfile.web` によるイメージのビルドと ECR への push、マイグレーションの適用（デプロイ前の1回限りの ECS タスク）、ECS のローリングデプロイを行う。CDK の変更は `cdk diff` を確認してから適用する
- build-23 の申し送りを受けて、次を足す
  - ALB の SG を CloudFront のマネージドプレフィックスリストに限る（または CloudFront が付ける秘密ヘッダーをリスナールールで検証する）。build-23 では HTTP:80 を全許可で作っている
  - api の DB 接続を SSL にする（`sslmode=require` 以上。可能なら `verify-full` と RDS CA バンドル）。RDS は `rds.force_ssl=1` で非 SSL を拒否するので、api 側の設定が漏れると起動直後に落ち続ける
  - ALB は `/api/*` をパス書き換えなしで api へ転送し、api のルートは `/api` 付きではない。CloudFront でパスを書き換えるか、api にプレフィックスを持たせるかをここで決める（`/health` のヘルスチェックはコンテナへ直接届くので、ずれても検知されない）
  - CD は ECR のタグが不変（IMMUTABLE）なので、commit SHA を `cdk deploy -c imageTag=<sha>` で渡す（imageTag は必須で既定値は無い）
  - 初回のデプロイ手順: ECR スタックを先にデプロイ → イメージを push → 残りのスタックをデプロイ（空のリポジトリではタスクが起動しない）。手順を CD か手順書に残す

## やらないこと

- 実際の AWS アカウントへのデプロイと SES の本番移行申請（運用作業）
- ドメイン・証明書の取得（変数として受け取る）

## 対応する受け入れ基準

- なし（成果物: 本番環境のインフラのコード）

## 受け入れ基準

- [ ] `cdk synth` が通り、スナップショットテストが通る
- [ ] `pending/` が CloudFront の経路から配信されず、`images/` のみ配信される
- [ ] ゲストの単体ページ（クッキーなし）だけが短 TTL でキャッシュされ、クッキーがあるリクエストは共有キャッシュを使わない設定になっている
- [ ] api タスクが S3・SES・CloudFront 無効化の権限を持つ
- [ ] CD ワークフローが build-27 の Dockerfile で web / api イメージをビルドして ECR に push する定義になっている
- [ ] CD ワークフローが、マイグレーション適用 → ローリングデプロイの順に実行する定義になっている
- [ ] CD ワークフローが commit SHA の imageTag を `-c` で渡してデプロイする定義になっている
- [ ] ALB の SG が CloudFront 経由以外の HTTP を受けない設定になっている（スナップショットで確認）
- [ ] api に DB 接続の SSL 設定が渡される（環境変数または接続文字列）
- [ ] CloudFront と ALB の間で `/api` のパスが api のルートと一致する（書き換えまたはプレフィックスの方針が決まっている）
- [ ] 初回デプロイの順序（ECR → イメージ push → 残り）が手順に書かれている

## 参照する設計ドキュメント

- design-delta.md「単体ページの集中対策」「本番構成」「CI/CD と開発体制」
- ADR: `20261030-post-page-cdn-cache.md`, `20261030-iac-aws-cdk.md`

## BP見積もり

作成するファイル: `infra/lib/storage-stack.ts`, `infra/lib/cdn-stack.ts`, `infra/lib/mail-stack.ts`, `infra/lib/iam.ts`, `infra/lib/cache-policies.ts`, `infra/test/cdn.test.ts`, `infra/test/storage.test.ts`, `.github/workflows/deploy.yml`, `scripts/run-migrations-task.sh`, `infra/lib/service-stack.ts`（変更）

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 10 | 3（ベース） |
| 実装行数（テスト含む） | 700 | 3 |
| API操作数 | 0 | 1 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 3 | +0 |
| 基盤セットアップ（CD） | あり | +1 |
| 外部API連携（AWS） | あり | +1 |
| 合計 | | 5 |
