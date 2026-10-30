# Build 23: インフラ: ネットワーク・DB・ECS

G6 で build-23 から Dockerfile を build-27 に分割した（委任された判断。BP 再算出 8 → 5）。このビルドは CDK のコードとテストだけを扱う。

## 依存パッケージ

| パッケージ | 用途 | 備考 |
|-----------|------|------|
| `aws-cdk-lib` | CDK 本体 | 新規追加（`infra`） |
| `constructs` | CDK の構成要素 | 新規追加（`infra`） |
| `aws-cdk` | `cdk synth` / `cdk diff` の CLI | devDependency |
| `tsx` / `typescript` / `vitest` / `@types/node` | 実行・型検査・スナップショットテスト | devDependency。バージョンは api と揃える（typescript は `^5.9.3`） |

`pnpm-workspace.yaml` に `infra` を追加済み。

## クラス設計

アプリは 3 スタックに分ける。スタック間の参照は props で渡す（CDK のクロススタック参照）。

```ts
// infra/lib/config.ts
export type EnvConfig = {
  env: { account?: string; region: string };   // 既定 ap-northeast-1
  maxAzs: 2;
  webDesiredCount: number;                      // 既定 2（最小 2）
  apiDesiredCount: number;                      // 既定 2（最小 2）
  maxTaskCount: number;                         // オートスケール上限 既定 6
  dbInstanceClass: string;                      // 既定 "t4g.medium"
  apiPathPattern: string;                       // 既定 "/api/*"
  imageTag: string;                             // context "imageTag"。既定 "latest"
};
export function loadConfig(app: App): EnvConfig;
// context キー: region, webDesiredCount, apiDesiredCount, maxTaskCount, dbInstanceClass, apiPathPattern, imageTag
// （CLI の `-c` は文字列で来るので数値に変換する）。検証: desiredCount は 2 以上の整数、
// maxTaskCount は desiredCount 以上の整数、imageTag は空でない。違反は Error を投げる（文言は固定しない）。

// infra/lib/network-stack.ts
export class NetworkStack extends Stack {
  readonly vpc: ec2.Vpc;                        // 2AZ、public/private(egress)、NAT 1つ
  constructor(scope: Construct, id: string, props?: StackProps);
}

// infra/lib/ecr-stack.ts
export class EcrStack extends Stack {
  readonly webRepo: ecr.Repository;
  readonly apiRepo: ecr.Repository;             // ライフサイクル: 未タグ削除、最新 N 件保持
  constructor(scope: Construct, id: string, props?: StackProps);
}

// 秘密情報は DB の認証情報だけ（RDS が生成する Secret = DatabaseStack.secret）。
// セッションは DB に保存する不透明トークンのハッシュ方式なので、アプリ用の署名鍵は作らない。

// infra/lib/database-stack.ts
export type DatabaseStackProps = StackProps & { vpc: ec2.IVpc; config: EnvConfig };
export class DatabaseStack extends Stack {
  readonly instance: rds.DatabaseInstance;      // PostgreSQL 17、Multi-AZ、暗号化、private subnet
  readonly secret: secretsmanager.ISecret;
  readonly securityGroup: ec2.SecurityGroup;    // ingress 無しで作る。5432 の許可は ServiceStack が addIngressRule で足す（スタック間の循環参照を避ける）
  constructor(scope: Construct, id: string, props: DatabaseStackProps);
}

// infra/lib/alb.ts
export function createAlb(scope: Construct, vpc: ec2.IVpc): {
  alb: elbv2.ApplicationLoadBalancer;
  listener: elbv2.ApplicationListener;          // HTTP :80（証明書は build-24 の CloudFront 側。ここでは HTTP のみ）
};

// infra/lib/service-stack.ts
export type ServiceStackProps = StackProps & {
  vpc: ec2.IVpc; config: EnvConfig;
  webRepo: ecr.IRepository; apiRepo: ecr.IRepository;
  database: DatabaseStack;
};
export class ServiceStack extends Stack {
  readonly cluster: ecs.Cluster;
  readonly webService: ecs.FargateService;
  readonly apiService: ecs.FargateService;
  readonly alb: elbv2.ApplicationLoadBalancer;
  constructor(scope: Construct, id: string, props: ServiceStackProps);
}
```

- web / api は Fargate（0.5 vCPU / 1GB）、private subnet に配置し、2 AZ へ分散する（`desiredCount` 2 以上、`minHealthyPercent` 100、`maxHealthyPercent` 200 のローリング）。
- オートスケールは CPU 60% 目標で最小 2、最大 `maxTaskCount`。
- web と api はそれぞれ別の SG を持つ。DB の 5432 は api の SG だけに許可する（web は DB に触らない）。
- ALB のリスナールールは `/api/*` を api、それ以外を web に振る（パスは `EnvConfig.apiPathPattern`、既定 `/api/*`。build-24 の CloudFront と合わせる）。ALB の SG は 80 を全許可で作り、CloudFront 経由に限る制限は build-24 で足す（handoff.md に申し送る）。ヘルスチェックは api が `/health`、web が `/`。
- api のコンテナへ `DATABASE_URL` を組み立てるための接続情報を Secrets Manager から注入する（`ecs.Secret.fromSecretsManager`）。プレーンな環境変数に秘密を置かない。
- RDS のパラメータグループは family `postgres17`。`shared_preload_libraries` には pg_bigm を入れない（未検証の設定でデプロイが失敗する危険を避ける。G8 で委任された判断）。pg_bigm は build-01 のマイグレーション（`CREATE EXTENSION IF NOT EXISTS pg_bigm`）だけで有効にし、パラメータグループは `rds.force_ssl=1` だけの最小設定にする。
- `apps/api` が読む環境変数は `DATABASE_URL` と `PORT` のみ（`config.ts` を確認済み）。DB の接続文字列は Secret の host / port / username / password / dbname から ECS の container secrets で個別に渡し、api 起動時の組み立て（`sslmode=require` を含む。RDS は ssl 必須）は build-24 のデプロイ設計で扱い、handoff.md に申し送る。このビルドでは接続情報を container secrets の `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` で渡すところまでとする。DB の Secret は RDS が自動生成する Secret（`GenerateSecretString` 方式、`ManageMasterUserPassword` は使わない）。環境変数（非秘密）は `PORT` だけを注入する（api は 8080、web は 3000）。web には secrets を渡さない。

## 非機能要件

- **セキュリティ**: 秘密情報は Secrets Manager 経由で渡し、コードに平文を置かない。RDS は private subnet、ストレージ暗号化、ssl 必須（`rds.force_ssl`）、削除保護あり。DB の SG は service の SG からの 5432 だけを許可する。ECS タスクは private subnet に置き、公開 IP を持たない。ECR はイメージスキャン有効。
- **パフォーマンス**: 該当なし（性能テストは build-25）。
- **エラーハンドリング**: 該当なし。
- **マージ時点のデータ安全**: 該当なし。新規のインフラコードの追加だけで、AWS へのデプロイは行わず、既存のコード・データ・API を変えない。

## BP見積もり

| 段階 | BP |
|------|----|
| architectフェーズ段階 | 5BP（分割後。分割前の issue.md の値は 5BP だったが、builder で Dockerfile を含めて再算出すると 8BP） |
| builderフェーズ段階 | 6BP |

6BP は `bp_max − 2` 以上だが分割しない。残りを分けても、`config.ts`・`bin/app.ts`・`test/stacks.test.ts` を複数ビルドが同じ箇所で編集することになり、マージコンフリクトが避けられない（build-manager の許容条件）。Dockerfile の分割（build-27）はすでに済んでいる。

**作成するファイル**

- `infra/package.json`（作成済み）, `infra/tsconfig.json`, `infra/cdk.json`, `infra/vitest.config.ts`
- `infra/bin/app.ts`（約 30 行）, `infra/lib/config.ts`（約 50 行）
- `infra/lib/network-stack.ts`（約 40 行）, `infra/lib/ecr-stack.ts`（約 40 行）
- `infra/lib/database-stack.ts`（約 100 行）, `infra/lib/alb.ts`（約 40 行）, `infra/lib/service-stack.ts`（約 200 行）
- `infra/test/stacks.test.ts`（約 200 行）

変更するファイル: `pnpm-workspace.yaml`（済）, `.gitignore`（`cdk.out`）, `biome.json`（`!infra/cdk.out`）, `docker/Dockerfile.dev`（`COPY infra/package.json infra/`。build-02 の申し送り）

**builderフェーズ段階の内訳**

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 12 | 3（ベース） |
| 実装行数（テスト含む） | 700 | 3 |
| API操作数 | 未指定 | — |
| 画面/ページ数 | 未指定 | — |
| DBテーブル/エンティティ数 | 未指定 | — |
| ベースBP（指標の最大値） | — | 3 |
| 影響ファイル数 | 4 | +1 |
| 基盤セットアップを含む | あり | +1 |
| 外部API連携を含む | あり | +1 |
| 既存コードの大規模リファクタ | 未指定 | +0 |
| **合計** | — | **6BP** |

## 実装ステップ

- [ ] Step 1: `infra` の土台（tsconfig / cdk.json / vitest.config.ts / `.gitignore` / `biome.json` / `docker/Dockerfile.dev` の COPY 追加）
- [ ] Step 2: `config.ts` と `bin/app.ts`
- [ ] Step 3: `network-stack.ts` と `ecr-stack.ts`
- [ ] Step 4: `database-stack.ts`（Multi-AZ、パラメータグループ、Secret、SG）
- [ ] Step 5: `alb.ts` と `service-stack.ts`（Fargate web / api、オートスケール、container secrets）
- [ ] Step 6: `test/stacks.test.ts`（スナップショットと、AZ 分散・Multi-AZ・Secrets 経由・DB の 5432 の許可元が service SG のみ、の個別アサーション）
- [ ] Step 7: ローカル検証（`pnpm lint` / `pnpm typecheck` / `pnpm test` / `cdk synth`）

## 未検証の事項

- RDS PostgreSQL 17 が pg_bigm 拡張をサポートし、`CREATE EXTENSION` だけで使えるかは未検証（ADR search-pg-bigm のトレードオフ欄にある確認事項）。調査用の WebSearch が承認されず確認できていない。デプロイ時に判明する。handoff.md の「意図的に残した未対応」に残す。
