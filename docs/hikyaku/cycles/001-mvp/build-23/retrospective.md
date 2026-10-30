# Build 23: インフラ: ネットワーク・DB・ECS 振り返り

## BP見積もりの振り返り

| 段階 | BP | 根拠 |
|------|----|------|
| architectフェーズ段階 | 5BP | issue.md のスコープ記述（Dockerfile を含む） |
| builderフェーズ段階 | 6BP | plan.md の内訳（下表。Dockerfile は build-27 に分割済み） |
| **実績** | **11BP** | 実測（新規ファイル数・追加行数）+ 申告（下表） |

**セッション**: 1セッションで完結（途中で build-27 を追加して分割。分割は plan.md の作成前、G6）

**乖離**: +5（実績 11 − builderフェーズ段階 6）

**乖離の要因**: 基準表の問題。入力値の読み違えは、新規ファイル数（見積もり 12、実測 13）と影響ファイル数（4、5）の±1 のみ。乖離のほぼ全部が実装行数で、見積もり 700 行に対し実測 2852 行（ベース 3 → 8）になった。実測には生成物が含まれる。CDK のスナップショット（`infra/test/__snapshots__/stacks.test.ts.snap`、1714 行）と `pnpm-lock.yaml`（100 行）で約 1800 行を占める。これらを除くと約 1040 行で、見積もりの 700 行より多いが、ベース 5 の範囲（〜2000 行）に収まる。それでも 1 セッションで無理なく完結したので、基準表の行数は生成物を数えると過大になる。

### builderフェーズ段階の内訳

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

### 実績の内訳

新規ファイル数・実装行数は `bp actual` の実測値。他は申告。

BP 11 = ベース 8 + 加算 3

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 13 | 3 |
| 実装行数（テスト含む） | 2852 | 8（ベース） |
| API操作数 | 未指定 | — |
| 画面/ページ数 | 未指定 | — |
| DBテーブル/エンティティ数 | 未指定 | — |
| ベースBP（指標の最大値） | — | 8 |
| 影響ファイル数 | 5 | +1 |
| 基盤セットアップを含む | あり | +1 |
| 外部API連携を含む | あり | +1 |
| 既存コードの大規模リファクタ | 未指定 | +0 |
| **合計** | — | **11BP** |

## セッション中にスキル外で受けた指示

なし（監督から委任された判断はすべてスキルのゲート（G6 / G8 / review-findings）への回答。pg_bigm を preload しない方針、imageTag を必須にする修正、build-24 / build-15 への申し送りの追記は、各回答に従って反映した）。

## 改善提案

### R-1: BP の実装行数から生成物を除く
- **状況**: Step 6 の `bp actual` と、plan.md の BP 見積もりの行数。CDK のスナップショットテストは 1714 行の `.snap` を生成し、これが実装行数の約 6 割を占めた。
- **指示内容**: なし（実績の集計で気づいた）。
- **提案**: BP の実装行数の数え方から、スナップショット（`__snapshots__/`）とロックファイルを除く。見積もりの段階でも「手書きの行数」で数える。
- **優先度**: Should
- **対象**: workflow
- **具体案**: `bp-guide/README.md` に追記する。「実装行数は手書きのコードとテストの行数で数える。スナップショット（`__snapshots__/`）と `pnpm-lock.yaml` などの生成物は数えない。`bp actual` の追加行数にはこれらが含まれるので、実績を求めるときは差し引く」。

## リポジトリ固有の学び（L-N）

### L-1: CDK の `addIngressRule` に別スタックの SG を渡すと DependencyCycle で synth が失敗する
- **再現条件**: `DatabaseStack` の SG に対して、`ServiceStack` で作った SG をピアに `database.securityGroup.addIngressRule(apiSg, Port.tcp(5432))` を呼び、`ServiceStack` が `database.secret` も参照する。`cdk synth` が `DependencyCycle: 'LitmusDatabase' depends on 'LitmusService'` で失敗する。
- **影響**: ルールが DB 側のスタックに置かれ、DB → Service の参照と Service → DB の参照で循環する。
- **回避策**: 使う側のスタック（`ServiceStack`）で `CfnSecurityGroupIngress` を明示的に作り、`groupId` に DB の SG の ID を渡す。
- **判明したビルド**: build-23
- **判明日**: 2026-10-30

### L-2: CloudFormation のセキュリティグループの説明に日本語を入れると検証の警告が出る
- **再現条件**: `ec2.SecurityGroup` の `description` に日本語を入れて `cdk synth` する。`GroupDescription ... does not match pattern` の警告が出る（CloudFormation Validate F3031）。
- **影響**: 警告のみで synth は通るが、デプロイ時に拒否される恐れがある。
- **回避策**: 説明は ASCII の英数字と記号だけにする。
- **判明したビルド**: build-23
- **判明日**: 2026-10-30

### L-3: ECR を IMMUTABLE にすると `latest` のような可変タグは 2 回目の push で失敗する
- **再現条件**: `imageTagMutability: IMMUTABLE` のリポジトリに、同じタグ（例: `latest`）を 2 回 push する。
- **影響**: CD が `latest` で更新できない。
- **回避策**: commit SHA をタグにし、`cdk deploy -c imageTag=<sha>` で渡す。`infra` の `imageTag` は必須で既定値を置かない。
- **判明したビルド**: build-23
- **判明日**: 2026-10-30
