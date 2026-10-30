# Build 23: インフラ: ネットワーク・DB・ECS

## やること

- `infra/` に AWS CDK（TypeScript）のプロジェクトを作り、`pnpm-workspace.yaml` に追加する
- VPC（2 AZ、パブリック/プライベートサブネット、NAT）、RDS PostgreSQL（Multi-AZ。pg_bigm は build-01 のマイグレーションで有効にする）、ECR、ECS クラスター、Fargate の web / api サービス（各2タスク以上、オートスケール）、ALB、Secrets Manager をコード化する
- ECS サービスは ECR のイメージタグをパラメータで受け取る（イメージ自体は build-27 が作り、build-24 が push する）
- CDK のスナップショットテストを用意する

## やらないこと

- S3・CloudFront・SES（build-24）、デプロイ CI（build-24）
- 本番用 Dockerfile（build-27）
- 実際の AWS アカウントへのデプロイ（このサイクルの成果物はコード）

## 対応する受け入れ基準

- なし（成果物: 本番環境のインフラのコード）

## 受け入れ基準

- [ ] `cdk synth` が通り、スナップショットテストが通る
- [ ] web / api が各2タスク以上、2 つの AZ に分散する設定になっている
- [ ] RDS が Multi-AZ で、パラメータグループが postgres17 family である（pg_bigm は `shared_preload_libraries` に入れず、マイグレーションの `CREATE EXTENSION` に任せる。RDS の pg_bigm サポートは未検証で、handoff.md に残す）
- [ ] 秘密情報が Secrets Manager 経由で渡され、コードに含まれない

## 参照する設計ドキュメント

- design-delta.md「本番構成（`infra/`）」
- ADR: `20261030-iac-aws-cdk.md`, `20261030-search-pg-bigm.md`

## BP見積もり

作成するファイル: `infra/package.json`, `infra/tsconfig.json`, `infra/cdk.json`, `infra/bin/app.ts`, `infra/lib/network-stack.ts`, `infra/lib/database-stack.ts`, `infra/lib/ecr-stack.ts`, `infra/lib/service-stack.ts`, `infra/lib/alb.ts`, `infra/lib/secrets.ts`, `infra/test/stacks.test.ts`, `infra/lib/config.ts`, `infra/vitest.config.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 13 | 3（ベース） |
| 実装行数（テスト含む） | 750 | 3 |
| 影響ファイル数 | 3 | +0 |
| 基盤セットアップ | あり | +1 |
| 外部API連携（AWS） | あり | +1 |
| 合計 | | 5 |

builder が Dockerfile を含めて再算出すると 8BP になったため、Dockerfile を build-27 に分けた。
