import { App, type Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../bin/app.js";
import { loadConfig } from "../lib/config.js";

type Context = Record<string, string | number>;

const STACKS = [
  "LitmusNetwork",
  "LitmusEcr",
  "LitmusDatabase",
  "LitmusService",
] as const;

// imageTag は必須（ECR のタグが不変なので既定値を持たない）
const TEST_IMAGE_TAG = "0123abc";

function build(context: Context = {}): App {
  return createApp(
    new App({ context: { imageTag: TEST_IMAGE_TAG, ...context } }),
  );
}

function templateOf(app: App, id: (typeof STACKS)[number]): Template {
  return Template.fromStack(app.node.findChild(id) as Stack);
}

// 型を絞った JSON の取り出し
function resourcesOf(template: Template, type: string) {
  return Object.values(template.findResources(type));
}

function containerOf(template: Template, name: "Web" | "Api") {
  const task = resourcesOf(template, "AWS::ECS::TaskDefinition").find(
    (resource) =>
      JSON.stringify(resource.Properties.ContainerDefinitions).includes(
        `"awslogs-stream-prefix":"${name.toLowerCase()}"`,
      ),
  );
  expect(task).toBeDefined();
  return task?.Properties.ContainerDefinitions[0];
}

beforeEach(() => {
  process.env.CDK_DEFAULT_ACCOUNT = "123456789012";
});

describe("loadConfig", () => {
  const load = (context: Context = {}) =>
    loadConfig(new App({ context: { imageTag: TEST_IMAGE_TAG, ...context } }));

  it("imageTag を指定しないとエラーになる", () => {
    expect(() => loadConfig(new App())).toThrow(/imageTag/);
  });

  it("imageTag 以外が未指定のとき既定値が返る", () => {
    const config = load();
    expect(config).toMatchObject({
      env: { region: "ap-northeast-1" },
      webDesiredCount: 2,
      apiDesiredCount: 2,
      maxTaskCount: 6,
      dbInstanceClass: "t4g.medium",
      apiPathPattern: "/api/*",
      imageTag: TEST_IMAGE_TAG,
    });
  });

  it("context で上書きした値が反映される", () => {
    const config = load({
      imageTag: "v1.2.3",
      webDesiredCount: 3,
      apiDesiredCount: 4,
      maxTaskCount: 10,
      dbInstanceClass: "m6g.large",
      apiPathPattern: "/v1/*",
    });
    expect(config).toMatchObject({
      imageTag: "v1.2.3",
      webDesiredCount: 3,
      apiDesiredCount: 4,
      maxTaskCount: 10,
      dbInstanceClass: "m6g.large",
      apiPathPattern: "/v1/*",
    });
  });

  it("CLI 由来の文字列の数値が数値に変換される", () => {
    expect(load({ webDesiredCount: "3" }).webDesiredCount).toBe(3);
  });

  it.each([
    ["webDesiredCount が 1", { webDesiredCount: 1 }],
    ["apiDesiredCount が 1", { apiDesiredCount: 1 }],
    ["apiDesiredCount が 0", { apiDesiredCount: 0 }],
    ["webDesiredCount が負数", { webDesiredCount: -1 }],
    ["webDesiredCount が数値でない", { webDesiredCount: "abc" }],
    ["apiDesiredCount が小数", { apiDesiredCount: "2.5" }],
    [
      "maxTaskCount が desiredCount を下回る",
      { webDesiredCount: 4, maxTaskCount: 3 },
    ],
    ["imageTag が空", { imageTag: "" }],
    ["region が空", { region: "" }],
    ["dbInstanceClass が空", { dbInstanceClass: "" }],
  ])("%s のときエラーになる", (_name, context) => {
    expect(() => load(context)).toThrow();
  });

  it("maxTaskCount が desiredCount と等しいとき受理される", () => {
    const config = load({
      webDesiredCount: 3,
      apiDesiredCount: 3,
      maxTaskCount: 3,
    });
    expect(config.maxTaskCount).toBe(3);
  });
});

describe("NetworkStack", () => {
  it("VPC が 2 AZ の public / private サブネットで作られる", () => {
    const template = templateOf(build(), "LitmusNetwork");
    const subnets = resourcesOf(template, "AWS::EC2::Subnet");
    expect(subnets).toHaveLength(4);
    const zones = new Set(
      subnets.map((s) => JSON.stringify(s.Properties.AvailabilityZone)),
    );
    expect(zones.size).toBe(2);
  });

  it("NAT Gateway が 1 つだけ作られ、private の既定ルートが NAT 向きである", () => {
    const template = templateOf(build(), "LitmusNetwork");
    template.resourceCountIs("AWS::EC2::NatGateway", 1);
    template.hasResourceProperties("AWS::EC2::Route", {
      DestinationCidrBlock: "0.0.0.0/0",
      NatGatewayId: Match.anyValue(),
    });
  });
});

describe("EcrStack", () => {
  it("web と api のリポジトリがスキャン有効・ライフサイクル付きで作られる", () => {
    const template = templateOf(build(), "LitmusEcr");
    template.resourceCountIs("AWS::ECR::Repository", 2);
    for (const repo of resourcesOf(template, "AWS::ECR::Repository")) {
      expect(repo.Properties.ImageScanningConfiguration.ScanOnPush).toBe(true);
      expect(repo.Properties.ImageTagMutability).toBe("IMMUTABLE");
      const policy = repo.Properties.LifecyclePolicy.LifecyclePolicyText;
      expect(policy).toContain("untagged");
      expect(policy).toContain("imageCountMoreThan");
    }
  });
});

describe("DatabaseStack", () => {
  it("RDS が Multi-AZ・暗号化・削除保護・非公開で作られる", () => {
    const template = templateOf(build(), "LitmusDatabase");
    template.resourceCountIs("AWS::RDS::DBInstance", 1);
    template.hasResourceProperties("AWS::RDS::DBInstance", {
      MultiAZ: true,
      DBInstanceClass: "db.t4g.medium",
      Engine: "postgres",
      EngineVersion: Match.stringLikeRegexp("^17"),
      StorageEncrypted: true,
      DeletionProtection: true,
      PubliclyAccessible: false,
    });
  });

  it("dbInstanceClass の上書きがインスタンスに反映される", () => {
    const template = templateOf(
      build({ dbInstanceClass: "m6g.large" }),
      "LitmusDatabase",
    );
    template.hasResourceProperties("AWS::RDS::DBInstance", {
      DBInstanceClass: "db.m6g.large",
    });
  });

  it("パラメータグループが postgres17 で ssl 必須、pg_bigm を preload しない", () => {
    const template = templateOf(build(), "LitmusDatabase");
    template.resourceCountIs("AWS::RDS::DBParameterGroup", 1);
    template.hasResourceProperties("AWS::RDS::DBParameterGroup", {
      Family: "postgres17",
      Parameters: { "rds.force_ssl": "1" },
    });
    const [group] = resourcesOf(template, "AWS::RDS::DBParameterGroup");
    expect(group.Properties.Parameters).not.toHaveProperty(
      "shared_preload_libraries",
    );
    template.hasResourceProperties("AWS::RDS::DBInstance", {
      DBParameterGroupName: Match.objectLike({ Ref: Match.anyValue() }),
    });
  });

  it("認証情報が Secrets Manager の生成 Secret で、平文が無い", () => {
    const template = templateOf(build(), "LitmusDatabase");
    template.hasResourceProperties("AWS::SecretsManager::Secret", {
      GenerateSecretString: Match.objectLike({ GenerateStringKey: "password" }),
    });
    const [instance] = resourcesOf(template, "AWS::RDS::DBInstance");
    const password = instance.Properties.MasterUserPassword;
    expect(typeof password).not.toBe("string");
    expect(JSON.stringify(password)).toContain("{{resolve:secretsmanager:");
  });

  it("単体では DB の SG が外部から閉じている", () => {
    const template = templateOf(build(), "LitmusDatabase");
    template.resourceCountIs("AWS::EC2::SecurityGroupIngress", 0);
    for (const sg of resourcesOf(template, "AWS::EC2::SecurityGroup")) {
      expect(sg.Properties.SecurityGroupIngress).toBeUndefined();
    }
  });
});

describe("ServiceStack", () => {
  it("web と api の Fargate サービスが 2 つ、desiredCount 2・公開 IP 無しで作られる", () => {
    const template = templateOf(build(), "LitmusService");
    template.resourceCountIs("AWS::ECS::Service", 2);
    for (const service of resourcesOf(template, "AWS::ECS::Service")) {
      expect(service.Properties).toMatchObject({
        LaunchType: "FARGATE",
        DesiredCount: 2,
        DeploymentConfiguration: {
          MinimumHealthyPercent: 100,
          MaximumPercent: 200,
        },
        NetworkConfiguration: {
          AwsvpcConfiguration: { AssignPublicIp: "DISABLED" },
        },
      });
    }
  });

  it("サービスが 2 つの private サブネットに配置される", () => {
    const template = templateOf(build(), "LitmusService");
    for (const service of resourcesOf(template, "AWS::ECS::Service")) {
      const subnets = JSON.stringify(
        service.Properties.NetworkConfiguration.AwsvpcConfiguration.Subnets,
      );
      expect(
        service.Properties.NetworkConfiguration.AwsvpcConfiguration.Subnets,
      ).toHaveLength(2);
      expect(subnets).toContain("privateSubnet1");
      expect(subnets).toContain("privateSubnet2");
      expect(subnets).not.toContain("publicSubnet");
    }
  });

  it("config の desiredCount が反映される", () => {
    const template = templateOf(
      build({ webDesiredCount: 3, apiDesiredCount: 4 }),
      "LitmusService",
    );
    const counts = resourcesOf(template, "AWS::ECS::Service")
      .map((s) => s.Properties.DesiredCount)
      .sort();
    expect(counts).toEqual([3, 4]);
  });

  it("タスク定義が 0.5 vCPU / 1GB の Fargate である", () => {
    const template = templateOf(build(), "LitmusService");
    template.resourceCountIs("AWS::ECS::TaskDefinition", 2);
    template.allResourcesProperties("AWS::ECS::TaskDefinition", {
      Cpu: "512",
      Memory: "1024",
      RequiresCompatibilities: ["FARGATE"],
    });
  });

  it("オートスケールの最小値が desiredCount に追従する", () => {
    const template = templateOf(
      build({ webDesiredCount: 3, apiDesiredCount: 4 }),
      "LitmusService",
    );
    const mins = resourcesOf(
      template,
      "AWS::ApplicationAutoScaling::ScalableTarget",
    )
      .map((target) => target.Properties.MinCapacity)
      .sort();
    expect(mins).toEqual([3, 4]);
  });

  it("オートスケールが CPU 60% 目標で最小 2、最大 maxTaskCount", () => {
    const template = templateOf(build(), "LitmusService");
    template.resourceCountIs("AWS::ApplicationAutoScaling::ScalableTarget", 2);
    template.allResourcesProperties(
      "AWS::ApplicationAutoScaling::ScalableTarget",
      { MinCapacity: 2, MaxCapacity: 6 },
    );
    template.allResourcesProperties(
      "AWS::ApplicationAutoScaling::ScalingPolicy",
      {
        PolicyType: "TargetTrackingScaling",
        TargetTrackingScalingPolicyConfiguration: {
          PredefinedMetricSpecification: {
            PredefinedMetricType: "ECSServiceAverageCPUUtilization",
          },
          TargetValue: 60,
        },
      },
    );
  });

  it("イメージタグが config.imageTag から取られる", () => {
    const tagged = templateOf(build({ imageTag: "v1.2.3" }), "LitmusService");
    for (const name of ["Web", "Api"] as const) {
      expect(JSON.stringify(containerOf(tagged, name).Image)).toContain(
        ":v1.2.3",
      );
    }
  });

  it("ALB のリスナールールが /api/* を api に、既定を web に振る", () => {
    const template = templateOf(build(), "LitmusService");
    template.hasResourceProperties(
      "AWS::ElasticLoadBalancingV2::ListenerRule",
      {
        Priority: 10,
        Conditions: [
          { Field: "path-pattern", PathPatternConfig: { Values: ["/api/*"] } },
        ],
      },
    );
    template.resourceCountIs("AWS::ElasticLoadBalancingV2::Listener", 1);
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Port: 80,
      Protocol: "HTTP",
    });
  });

  it("api のパスパターンを config から変えられる", () => {
    const template = templateOf(
      build({ apiPathPattern: "/v1/*" }),
      "LitmusService",
    );
    const rules = JSON.stringify(
      resourcesOf(template, "AWS::ElasticLoadBalancingV2::ListenerRule"),
    );
    expect(rules).toContain("/v1/*");
    expect(rules).not.toContain("/api/*");
  });

  it("ヘルスチェックのパスが api は /health、web は / である", () => {
    const template = templateOf(build(), "LitmusService");
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      Port: 8080,
      HealthCheckPath: "/health",
    });
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      Port: 3000,
      HealthCheckPath: "/",
    });
  });

  it("ALB が internet-facing で、SG は 80 だけを許可する", () => {
    const template = templateOf(build(), "LitmusService");
    template.hasResourceProperties(
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      {
        Scheme: "internet-facing",
      },
    );
    const sgs = resourcesOf(template, "AWS::EC2::SecurityGroup").filter((sg) =>
      JSON.stringify(sg.Properties.SecurityGroupIngress ?? []).includes(
        "0.0.0.0/0",
      ),
    );
    expect(sgs).toHaveLength(1);
    expect(sgs[0].Properties.SecurityGroupIngress).toEqual([
      expect.objectContaining({
        FromPort: 80,
        ToPort: 80,
        CidrIp: "0.0.0.0/0",
      }),
    ]);
  });

  it("api の DB 接続情報が container secrets で Secrets Manager から渡される", () => {
    const template = templateOf(build(), "LitmusService");
    const secrets = containerOf(template, "Api").Secrets as {
      Name: string;
      ValueFrom: unknown;
    }[];
    expect(secrets.map((s) => s.Name).sort()).toEqual([
      "DB_HOST",
      "DB_NAME",
      "DB_PASSWORD",
      "DB_PORT",
      "DB_USERNAME",
    ]);
    // DB の Secret の ARN（Secret の Attachment の Ref）+ JSON フィールド名
    for (const secret of secrets) {
      const valueFrom = JSON.stringify(secret.ValueFrom);
      expect(valueFrom).toContain("InstanceSecretAttachment");
      expect(valueFrom).toMatch(/:(host|port|username|password|dbname)::/);
    }
  });

  it("秘密情報がプレーンな環境変数に含まれず、web は secrets を持たない", () => {
    const template = templateOf(build(), "LitmusService");
    const web = containerOf(template, "Web");
    const api = containerOf(template, "Api");
    expect(web.Secrets).toBeUndefined();
    expect(web.Environment).toEqual([{ Name: "PORT", Value: "3000" }]);
    expect(api.Environment).toEqual([{ Name: "PORT", Value: "8080" }]);
  });

  it("実行ロールが Secret の読み取りだけを個別 ARN に許可する", () => {
    const template = templateOf(build(), "LitmusService");
    const statements = resourcesOf(template, "AWS::IAM::Policy").flatMap(
      (policy) => policy.Properties.PolicyDocument.Statement,
    );
    const secretStatements = statements.filter(
      (statement: { Action: unknown }) =>
        JSON.stringify(statement.Action).includes(
          "secretsmanager:GetSecretValue",
        ),
    );
    expect(secretStatements.length).toBeGreaterThan(0);
    for (const statement of secretStatements) {
      expect(statement.Resource).not.toBe("*");
    }
  });

  it("DB の 5432 は api の SG だけから許可される", () => {
    const template = templateOf(build(), "LitmusService");
    const ingresses = resourcesOf(
      template,
      "AWS::EC2::SecurityGroupIngress",
    ).filter((r) => r.Properties.FromPort === 5432);
    expect(ingresses).toHaveLength(1);
    expect(ingresses[0].Properties).toMatchObject({ ToPort: 5432 });
    expect(ingresses[0].Properties).not.toHaveProperty("CidrIp");
    expect(
      JSON.stringify(ingresses[0].Properties.SourceSecurityGroupId),
    ).toContain("ApiSecurityGroup");
  });

  it("ECS クラスターとログが作られる", () => {
    const template = templateOf(build(), "LitmusService");
    template.resourceCountIs("AWS::ECS::Cluster", 1);
    for (const name of ["Web", "Api"] as const) {
      expect(containerOf(template, name).LogConfiguration.LogDriver).toBe(
        "awslogs",
      );
    }
  });
});

describe("app 全体", () => {
  it("スナップショットと一致し、決定的である", () => {
    const first = build();
    const second = build();
    for (const id of STACKS) {
      const json = templateOf(first, id).toJSON();
      expect(json).toMatchSnapshot(id);
      expect(templateOf(second, id).toJSON()).toEqual(json);
    }
  });

  it("スタックが循環せず、ServiceStack だけが他に依存する", () => {
    const app = build();
    app.synth(); // スタック間の依存はここで確定する
    const dependencies = (id: string) =>
      (app.node.findChild(id) as Stack).dependencies.map((d) => d.node.id);
    expect(dependencies("LitmusService").sort()).toEqual([
      "LitmusDatabase",
      "LitmusEcr",
      "LitmusNetwork",
    ]);
    expect(dependencies("LitmusNetwork")).toEqual([]);
    expect(dependencies("LitmusEcr")).toEqual([]);
    expect(dependencies("LitmusDatabase")).toEqual(["LitmusNetwork"]);
  });

  it("account 未指定でも合成できる", () => {
    delete process.env.CDK_DEFAULT_ACCOUNT;
    const template = templateOf(build(), "LitmusNetwork");
    template.resourceCountIs("AWS::EC2::Subnet", 4);
  });

  it("desiredCount 1 の context では合成が失敗する", () => {
    expect(() => build({ webDesiredCount: 1 })).toThrow();
  });

  it("テンプレートにリテラルのパスワードが無い", () => {
    const app = build();
    for (const id of STACKS) {
      const text = JSON.stringify(templateOf(app, id).toJSON());
      expect(text).not.toMatch(/"(Password|SecretString)":"/);
    }
  });

  it("S3・CloudFront・SES を含まない（build-24 の範囲）", () => {
    const app = build();
    const types = STACKS.flatMap((id) =>
      Object.values(
        templateOf(app, id).toJSON().Resources as Record<
          string,
          { Type: string }
        >,
      ).map((resource) => resource.Type),
    );
    expect(types.filter((t) => /^AWS::(S3|CloudFront|SES)::/.test(t))).toEqual(
      [],
    );
  });
});
