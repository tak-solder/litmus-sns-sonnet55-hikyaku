# Build 23: インフラ: ネットワーク・DB・ECS テストシナリオ

テストは `infra/test/stacks.test.ts` に置き、`aws-cdk-lib/assertions` の `Template` を使う。スナップショットと個別アサーションを併用する。Dockerfile は build-27 の対象でありここでは扱わない。

issue.md の受け入れ基準の番号は次のとおり。
- issue 基準1: cdk synth とスナップショット
- issue 基準2: web / api 各2タスク以上、2AZ 分散
- issue 基準3: RDS Multi-AZ と pg_bigm
- issue 基準4: 秘密情報が Secrets Manager 経由で、コードに平文が無い

## loadConfig（infra/lib/config.ts）

### loadConfig: context 未指定のとき既定値が返る
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: context を何も設定していない `new App()`
- When: `loadConfig(app)` を呼ぶ
- Then: `env.region` が `ap-northeast-1`、`maxAzs` が 2、`webDesiredCount` が 2、`apiDesiredCount` が 2、`maxTaskCount` が 6、`dbInstanceClass` が `t4g.medium`、`imageTag` が `latest` である

### loadConfig: context で上書きした値が反映される
- 対応: —
- Given: context に `imageTag=v1.2.3`、`webDesiredCount=3`、`apiDesiredCount=4`、`maxTaskCount=10`、`dbInstanceClass=m6g.large` を設定した App
- When: `loadConfig(app)` を呼ぶ
- Then: 返り値の `imageTag` が `v1.2.3`、`webDesiredCount` が 3、`apiDesiredCount` が 4、`maxTaskCount` が 10、`dbInstanceClass` が `m6g.large` である

### loadConfig: CLI 由来の文字列の数値が数値に変換される
- 対応: —
- Given: context の `webDesiredCount` が文字列 `"3"`（`-c webDesiredCount=3` 相当）
- When: `loadConfig(app)` を呼ぶ
- Then: `webDesiredCount` が数値 `3` で返る（文字列 `"3"` ではない）

### loadConfig: desiredCount が最小値 2 ちょうどのとき受理される（境界値）
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: context の `webDesiredCount=2`、`apiDesiredCount=2`
- When: `loadConfig(app)` を呼ぶ
- Then: 例外を投げず、両方 2 で返る

### loadConfig: webDesiredCount が 1 のときエラーになる
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: context の `webDesiredCount=1`、`apiDesiredCount=2`
- When: `loadConfig(app)` を呼ぶ
- Then: 「web は 2 以上」を示すメッセージの Error が投げられ、2 AZ 分散を満たさない構成が synth に進まない

### loadConfig: apiDesiredCount が 1 のときエラーになる
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: context の `webDesiredCount=2`、`apiDesiredCount=1`
- When: `loadConfig(app)` を呼ぶ
- Then: 「api は 2 以上」を示すメッセージの Error が投げられる

### loadConfig: desiredCount が 0 のときエラーになる（境界値）
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: context の `apiDesiredCount=0`
- When: `loadConfig(app)` を呼ぶ
- Then: Error が投げられる（0 を「未指定」とみなして既定値 2 に置き換えない）

### loadConfig: desiredCount が負数のときエラーになる
- 対応: —
- Given: context の `webDesiredCount=-1`
- When: `loadConfig(app)` を呼ぶ
- Then: Error が投げられる

### loadConfig: desiredCount が数値でないときエラーになる
- 対応: —
- Given: context の `webDesiredCount="abc"`
- When: `loadConfig(app)` を呼ぶ
- Then: Error が投げられる（NaN のまま後段へ渡らない）

### loadConfig: desiredCount が小数のときエラーになる
- 対応: —
- Given: context の `apiDesiredCount="2.5"`
- When: `loadConfig(app)` を呼ぶ
- Then: Error が投げられる

### loadConfig: maxTaskCount が desiredCount と等しいとき受理される（境界値）
- 対応: —
- Given: context の `webDesiredCount=3`、`apiDesiredCount=3`、`maxTaskCount=3`
- When: `loadConfig(app)` を呼ぶ
- Then: 例外を投げず、`maxTaskCount` が 3 で返る

### loadConfig: maxTaskCount が desiredCount を下回るときエラーになる
- 対応: —
- Given: context の `webDesiredCount=4`、`apiDesiredCount=2`、`maxTaskCount=3`
- When: `loadConfig(app)` を呼ぶ
- Then: オートスケール上限が現在の台数を下回る旨の Error が投げられる

### loadConfig: imageTag が空文字のときエラーになる
- 対応: —
- Given: context の `imageTag=""`
- When: `loadConfig(app)` を呼ぶ
- Then: Error が投げられる（空タグのイメージ参照を作らない）

## NetworkStack（infra/lib/network-stack.ts）

### constructor: VPC が 2 AZ の public / private サブネットで作られる
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: region `ap-northeast-1`、account 指定済みの env を持つ `NetworkStack`
- When: `Template.fromStack` で合成する
- Then: `AWS::EC2::Subnet` が 4 つ（public 2 つ、private 2 つ）で、`AvailabilityZone` が 2 種類に分かれ、各 AZ に public と private が 1 つずつある

### constructor: NAT Gateway が 1 つだけ作られる
- 対応: —
- Given: 上記の `NetworkStack`
- When: 合成する
- Then: `AWS::EC2::NatGateway` がちょうど 1 つで、public サブネットに置かれる（費用目安 300 米ドルのための単一 NAT）

### constructor: private サブネットの既定ルートが NAT 向きである
- 対応: —
- Given: 上記の `NetworkStack`
- When: 合成する
- Then: private サブネットのルートテーブルに `0.0.0.0/0` で `NatGatewayId` を持つ `AWS::EC2::Route` があり、`GatewayId`（IGW）向きは public 側だけである

### constructor: vpc プロパティが公開される
- 対応: —
- Given: `NetworkStack` のインスタンス
- When: `stack.vpc.availabilityZones` を参照する
- Then: 長さが 2 である

## EcrStack（infra/lib/ecr-stack.ts）

### constructor: web と api の ECR リポジトリが 1 つずつ作られる
- 対応: —
- Given: `EcrStack`
- When: 合成する
- Then: `AWS::ECR::Repository` がちょうど 2 つで、`webRepo` と `apiRepo` がそれぞれ別の論理 ID を持つ

### constructor: イメージスキャンが有効である
- 対応: —
- Given: `EcrStack`
- When: 合成する
- Then: すべての `AWS::ECR::Repository` の `ImageScanningConfiguration.ScanOnPush` が `true` である

### constructor: ライフサイクルルールが未タグ削除と保持件数を含む
- 対応: —
- Given: `EcrStack`
- When: 合成する
- Then: 各リポジトリの `LifecyclePolicy.LifecyclePolicyText` に、未タグイメージを削除するルールと、最新 N 件だけを保持するルールの両方が含まれる

## DatabaseStack（infra/lib/database-stack.ts）

### constructor: RDS が Multi-AZ で作られる
- 対応: issue 基準3: RDS Multi-AZ と pg_bigm
- Given: `DatabaseStack`（`config.dbInstanceClass=t4g.medium`、`vpc` は NetworkStack のもの）
- When: 合成する
- Then: `AWS::RDS::DBInstance` がちょうど 1 つで、`MultiAZ` が `true`、`DBInstanceClass` が `db.t4g.medium`、`Engine` が `postgres`、`EngineVersion` が 17 系である

### constructor: dbInstanceClass の上書きがインスタンスに反映される
- 対応: —
- Given: `config.dbInstanceClass=m6g.large` の `DatabaseStack`
- When: 合成する
- Then: `DBInstanceClass` が `db.m6g.large` である

### constructor: パラメータグループの family が postgres17 である
- 対応: issue 基準3: RDS Multi-AZ と pg_bigm
- Given: `DatabaseStack`
- When: 合成する
- Then: `AWS::RDS::DBParameterGroup` が 1 つで、`Family` が `postgres17` である

### constructor: shared_preload_libraries に pg_bigm が含まれる
- 対応: issue 基準3: RDS Multi-AZ と pg_bigm
- Given: `DatabaseStack`
- When: 合成する
- Then: `DBParameterGroup` の `Parameters["shared_preload_libraries"]` が `pg_bigm` を含む

### constructor: DBInstance がそのパラメータグループを参照する
- 対応: issue 基準3: RDS Multi-AZ と pg_bigm
- Given: `DatabaseStack`
- When: 合成する
- Then: `DBInstance.DBParameterGroupName` が `Ref` でパラメータグループの論理 ID を指す（設定がどのインスタンスにも適用されない状態を防ぐ）

### constructor: SSL が必須である
- 対応: —
- Given: `DatabaseStack`
- When: 合成する
- Then: `DBParameterGroup` の `Parameters["rds.force_ssl"]` が `"1"` である

### constructor: ストレージ暗号化と削除保護が有効である
- 対応: —
- Given: `DatabaseStack`
- When: 合成する
- Then: `DBInstance` の `StorageEncrypted` が `true`、`DeletionProtection` が `true` である

### constructor: RDS が private サブネットにあり公開されない
- 対応: —
- Given: `DatabaseStack`
- When: 合成する
- Then: `DBInstance.PubliclyAccessible` が `false` で、`AWS::RDS::DBSubnetGroup` の `SubnetIds` が private サブネットだけを指す

### constructor: 認証情報が Secrets Manager の生成 Secret で、平文が無い
- 対応: issue 基準4: 秘密情報が Secrets Manager 経由で、コードに平文が無い
- Given: `DatabaseStack`
- When: 合成する
- Then: `AWS::SecretsManager::Secret` に `GenerateSecretString` があり、`DBInstance.MasterUserPassword` は固定文字列ではなく `{{resolve:secretsmanager:` を含む動的参照（または `ManageMasterUserPassword: true`）である

### constructor: secret プロパティが ECS から参照できる形で公開される
- 対応: issue 基準4: 秘密情報が Secrets Manager 経由で、コードに平文が無い
- Given: `DatabaseStack` のインスタンス
- When: `stack.secret.secretArn` を参照する
- Then: 値が定義されている（`ISecret` として ServiceStack に渡せる）

### constructor: DatabaseStack 単体では DB の SG が外部から閉じている
- 対応: —
- Given: `DatabaseStack` を単体で合成する（5432 の許可は ServiceStack が足すため、このスタックには ingress が無い）
- When: 合成する
- Then: `AWS::EC2::SecurityGroupIngress` が 1 つも無く、DB の SG に `CidrIp` を持つ ingress が無い

## createAlb（infra/lib/alb.ts）

### createAlb: ALB が public サブネットに置かれる
- 対応: —
- Given: 2 AZ の VPC に対し `createAlb(stack, vpc)`
- When: 合成する
- Then: `AWS::ElasticLoadBalancingV2::LoadBalancer` の `Scheme` が `internet-facing`、`Subnets` が 2 つの public サブネットを指す

### createAlb: リスナーが HTTP 80 の 1 つだけである
- 対応: —
- Given: 上記
- When: 合成する
- Then: `AWS::ElasticLoadBalancingV2::Listener` がちょうど 1 つで、`Port` が 80、`Protocol` が `HTTP` である（HTTPS 証明書は build-24）

## ServiceStack（infra/lib/service-stack.ts）

### constructor: 全体が合成でき、スナップショットと一致する
- 対応: issue 基準1: cdk synth とスナップショット
- Given: 既定 config の `NetworkStack`、`EcrStack`、`DatabaseStack`、`ServiceStack` を 1 つの App に作る
- When: 各スタックの `Template.fromStack(stack).toJSON()` を `toMatchSnapshot()` で比較する
- Then: 例外なく合成でき、保存済みスナップショットと一致する。スナップショット内に実在のアカウント ID・パスワード・トークンの文字列が含まれない

### constructor: スナップショットが決定的である
- 対応: issue 基準1: cdk synth とスナップショット
- Given: 同じ config で App を 2 回作る
- When: 2 つの `Template.toJSON()` を比較する
- Then: 完全に一致する（乱数やタイムスタンプで差分が出ない）

### constructor: web と api の Fargate サービスが 2 つ作られる
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: 既定 config の `ServiceStack`
- When: 合成する
- Then: `AWS::ECS::Service` がちょうど 2 つで、`LaunchType` が `FARGATE`、どちらも `Cluster` が同じ ECS クラスターを指す

### constructor: web と api の DesiredCount が 2 以上である
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: 既定 config の `ServiceStack`
- When: 合成する
- Then: 2 つの `AWS::ECS::Service` の `DesiredCount` がともに 2 である

### constructor: config の desiredCount が反映される
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: `webDesiredCount=3`、`apiDesiredCount=4` の config
- When: 合成する
- Then: web サービスの `DesiredCount` が 3、api サービスが 4 である

### constructor: サービスが 2 つの private サブネット（2 AZ）に配置される
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: 2 AZ の VPC を使う `ServiceStack`
- When: 合成する
- Then: 各 `AWS::ECS::Service` の `NetworkConfiguration.AwsvpcConfiguration.Subnets` が、異なる AZ にある 2 つの private サブネットを指す

### constructor: タスクが公開 IP を持たない
- 対応: —
- Given: 既定 config の `ServiceStack`
- When: 合成する
- Then: 両サービスの `AssignPublicIp` が `DISABLED` である

### constructor: ローリングデプロイの比率が 100 / 200 である
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: 既定 config の `ServiceStack`
- When: 合成する
- Then: 両サービスの `DeploymentConfiguration.MinimumHealthyPercent` が 100、`MaximumPercent` が 200 である

### constructor: タスク定義が 0.5 vCPU / 1GB である
- 対応: —
- Given: 既定 config の `ServiceStack`
- When: 合成する
- Then: `AWS::ECS::TaskDefinition` が 2 つで、`Cpu` が `"512"`、`Memory` が `"1024"`、`RequiresCompatibilities` が `FARGATE` である

### constructor: オートスケールが CPU 60% 目標で最小 2、最大 maxTaskCount
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: 既定 config（`maxTaskCount=6`）の `ServiceStack`
- When: 合成する
- Then: `AWS::ApplicationAutoScaling::ScalableTarget` が 2 つあり、どちらも `MinCapacity=2`、`MaxCapacity=6`。`ScalingPolicy` は `TargetTrackingScaling` で `PredefinedMetricType=ECSServiceAverageCPUUtilization`、`TargetValue=60` である

### constructor: desiredCount が 3 のとき MinCapacity が 2 を下回らない（境界値）
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: `webDesiredCount=3` の config
- When: 合成する
- Then: web の `ScalableTarget.MinCapacity` が 2 以上で、`MaxCapacity` が `maxTaskCount`（6）以下である

### constructor: イメージタグが config.imageTag から取られる
- 対応: —
- Given: `imageTag=v1.2.3` の config と、`webRepo`・`apiRepo` を渡した `ServiceStack`
- When: 合成する
- Then: TaskDefinition の `ContainerDefinitions[0].Image` が、web / api それぞれの ECR リポジトリ URI と `:v1.2.3` を連結した形を含む

### constructor: imageTag 未指定のとき latest になる
- 対応: —
- Given: context に `imageTag` が無い config
- When: 合成する
- Then: `Image` が `:latest` で終わる

### constructor: ALB のリスナールールが /api/* を api に、既定を web に振る
- 対応: —
- Given: 既定 config の `ServiceStack`
- When: 合成する
- Then: `AWS::ElasticLoadBalancingV2::ListenerRule` に `path-pattern` が `/api/*` の条件があり、api のターゲットグループへ forward する。Listener の既定アクションは web のターゲットグループである

### constructor: api パス prefix を config から変えられる
- 対応: —
- Given: api のパスパターンを `/v1/*` に変えた config（指定できる場合）
- When: 合成する
- Then: ListenerRule の `path-pattern` が `/v1/*` になり、`/api/*` は残らない

### constructor: ヘルスチェックのパスが api は /health、web は / である
- 対応: —
- Given: 既定 config の `ServiceStack`
- When: 合成する
- Then: api の `AWS::ElasticLoadBalancingV2::TargetGroup.HealthCheckPath` が `/health`、web が `/` である

### constructor: api の DB 接続情報が container secrets で Secrets Manager から渡される
- 対応: issue 基準4: 秘密情報が Secrets Manager 経由で、コードに平文が無い
- Given: 既定 config の `ServiceStack`（`database.secret` を渡す）
- When: 合成する
- Then: api の `ContainerDefinitions[0].Secrets` に `DB_HOST`、`DB_PORT`、`DB_USERNAME`、`DB_PASSWORD`、`DB_NAME` があり、各 `ValueFrom` が DB の Secret の ARN（と JSON フィールド名）を指す

### constructor: 秘密情報がプレーンな環境変数に含まれない
- 対応: issue 基準4: 秘密情報が Secrets Manager 経由で、コードに平文が無い
- Given: 既定 config の `ServiceStack`
- When: 全 `ContainerDefinitions[*].Environment` の Name を集める
- Then: `DB_PASSWORD`、`DATABASE_URL` が含まれない。`PORT` など非秘密の値だけが含まれる

### constructor: 合成テンプレート全体に平文のパスワードが無い
- 対応: issue 基準4: 秘密情報が Secrets Manager 経由で、コードに平文が無い
- Given: 全スタックを合成した JSON 文字列
- When: `password`、`secret` を名前に含むプロパティの値を走査する
- Then: 値はすべて `Ref` / `Fn::GetAtt` / `{{resolve:secretsmanager:` の動的参照か `GenerateSecretString` の設定であり、リテラル文字列のパスワードが 1 つも無い

### constructor: タスクの実行ロールが Secret の読み取り権限を持つ
- 対応: issue 基準4: 秘密情報が Secrets Manager 経由で、コードに平文が無い
- Given: 既定 config の `ServiceStack`
- When: 合成する
- Then: ECS の execution role の `AWS::IAM::Policy` に `secretsmanager:GetSecretValue` を DB の Secret の ARN に対して許可する Statement があり、`Resource: "*"` ではない

### constructor: service の SG から DB への 5432 が許可される
- 対応: issue 基準3: RDS Multi-AZ と pg_bigm
- Given: `DatabaseStack` と `ServiceStack` を props で接続した App
- When: 合成する
- Then: DB の SG への ingress の `SourceSecurityGroupId` が ServiceStack 側の SG を指し、スタック間参照（Export / ImportValue）で解決できる

### constructor: web サービスは DB への経路を持たない
- 対応: —
- Given: 上記の App
- When: DB の SG への ingress の Source を列挙する
- Then: 許可元が api 用の SG のみ（`FromPort=5432`、`ToPort=5432`）で、web 用の SG と `CidrIp` は含まれない（web は DB に触らない設計）

### constructor: ECS クラスターとログが作られる
- 対応: —
- Given: 既定 config の `ServiceStack`
- When: 合成する
- Then: `AWS::ECS::Cluster` が 1 つあり、両タスク定義に `LogConfiguration`（`awslogs`）がある

## bin/app（infra/bin/app.ts）

### app: 全スタックの cdk synth が通る
- 対応: issue 基準1: cdk synth とスナップショット
- Given: `infra/` で依存をインストール済みの環境
- When: `pnpm --filter infra exec cdk synth` を実行する
- Then: 終了コード 0 で、`cdk.out` に NetworkStack、EcrStack、DatabaseStack、ServiceStack のテンプレートが出力される

### app: スタック間の依存で循環参照が起きない
- 対応: issue 基準1: cdk synth とスナップショット
- Given: 4 スタックを組み立てた App
- When: `app.synth()` を呼ぶ
- Then: 例外が投げられず、`ServiceStack` が `NetworkStack`・`EcrStack`・`DatabaseStack` に依存し、逆向きの依存は無い

### app: desiredCount 1 の context で synth が失敗する
- 対応: issue 基準2: web / api 各2タスク以上、2AZ 分散
- Given: `-c webDesiredCount=1` を指定した `cdk synth` 相当の実行
- When: App を組み立てる
- Then: `loadConfig` の Error で失敗し、`cdk.out` にテンプレートが生成されない

### app: account 未指定でも合成できる
- 対応: issue 基準1: cdk synth とスナップショット
- Given: `env.account` が未設定（環境非依存）の config
- When: `app.synth()` を呼ぶ
- Then: 例外なく合成でき、AZ は `Fn::GetAZs` ではなく 2 件分が解決できる形で出力される（テストでは固定 env を与えて確認する）

## インフラの範囲外の確認

### 全スタック: S3・CloudFront・SES を含まない
- 対応: —
- Given: 全スタックを合成したテンプレート
- When: リソースタイプを列挙する
- Then: `AWS::S3::Bucket`、`AWS::CloudFront::Distribution`、`AWS::SES::*` が 1 つも含まれない（build-24 の範囲）
