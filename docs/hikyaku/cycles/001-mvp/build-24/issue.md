# Build 24: インフラ: S3・CloudFront・SES・デプロイCI

## やること

- S3 バケット（`pending/` は配信しない、`images/` のみ CloudFront から配信）、CloudFront ディストリビューション（web と api の前段。ゲストの単体ページのキャッシュポリシー、セッションクッキーをキャッシュキーに含める設定、画像配信の設定）、SES（送信ドメイン・送信権限）を CDK でコード化する
- CloudFront の無効化を api タスクに許す IAM 権限と、api の S3 / SES 権限を足す
- GitHub Actions の CD を作る。main へのマージで、build-27 の `docker/Dockerfile.api` / `docker/Dockerfile.web` によるイメージのビルドと ECR への push、マイグレーションの適用（デプロイ前の1回限りの ECS タスク）、ECS のローリングデプロイを行う。CDK の変更は `cdk diff` を確認してから適用する

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
