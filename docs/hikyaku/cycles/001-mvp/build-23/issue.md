# Build 23: インフラ: ネットワーク・DB・ECS

## やること

- `infra/` に AWS CDK（TypeScript）のプロジェクトを作り、`pnpm-workspace.yaml` に追加する
- VPC（2 AZ、パブリック/プライベートサブネット、NAT）、RDS PostgreSQL（Multi-AZ。pg_bigm を有効にするパラメータグループ）、ECR、ECS クラスター、Fargate の web / api サービス（各2タスク以上、オートスケール）、ALB、Secrets Manager をコード化する
- 本番用の Dockerfile（web / api のマルチステージビルド）を作る
- CDK のスナップショットテストを用意する

## やらないこと

- S3・CloudFront・SES（build-24）、デプロイ CI（build-24）
- 実際の AWS アカウントへのデプロイ（このサイクルの成果物はコード）

## 対応する受け入れ基準

- なし（成果物: 本番環境のインフラのコード）

## 受け入れ基準

- [ ] `cdk synth` が通り、スナップショットテストが通る
- [ ] web / api が各2タスク以上、2 つの AZ に分散する設定になっている
- [ ] RDS が Multi-AZ で、pg_bigm の読み込み設定を含む
- [ ] 秘密情報が Secrets Manager 経由で渡され、コードに含まれない
- [ ] 本番用 Dockerfile でイメージがビルドできる

## 参照する設計ドキュメント

- design-delta.md「本番構成（`infra/`）」
- ADR: `20261030-iac-aws-cdk.md`, `20261030-search-pg-bigm.md`

## BP見積もり

作成するファイル: `infra/package.json`, `infra/tsconfig.json`, `infra/cdk.json`, `infra/bin/app.ts`, `infra/lib/network-stack.ts`, `infra/lib/database-stack.ts`, `infra/lib/ecr-stack.ts`, `infra/lib/service-stack.ts`, `infra/lib/alb.ts`, `infra/lib/secrets.ts`, `infra/test/stacks.test.ts`, `docker/Dockerfile.api`, `docker/Dockerfile.web`, `infra/lib/config.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 14 | 3（ベース） |
| 実装行数（テスト含む） | 900 | 3 |
| API操作数 | 0 | 1 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 3 | +0 |
| 基盤セットアップ | あり | +1 |
| 外部API連携（AWS） | あり | +1 |
| 合計 | | 5 |
