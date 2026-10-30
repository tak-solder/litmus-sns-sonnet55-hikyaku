import { Stack, type StackProps } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import type * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";
import { createAlb } from "./alb.js";
import { type EnvConfig, MIN_DESIRED_COUNT } from "./config.js";
import { type DatabaseStack, DB_NAME } from "./database-stack.js";

const WEB_PORT = 3000;
const API_PORT = 8080;
const DB_PORT = 5432;
const CPU_TARGET_PERCENT = 60;
// Fargate の 0.5 vCPU / 1GB
const TASK_CPU = 512;
const TASK_MEMORY_MIB = 1024;

export type ServiceStackProps = StackProps & {
  vpc: ec2.IVpc;
  config: EnvConfig;
  webRepo: ecr.IRepository;
  apiRepo: ecr.IRepository;
  database: DatabaseStack;
};

export class ServiceStack extends Stack {
  readonly cluster: ecs.Cluster;
  readonly webService: ecs.FargateService;
  readonly apiService: ecs.FargateService;
  readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);
    const { vpc, config, database } = props;

    this.cluster = new ecs.Cluster(this, "Cluster", { vpc });
    const { alb, listener } = createAlb(this, vpc);
    this.alb = alb;

    const dbSecret = database.secret;
    const dbSecretEntry = (field: string) =>
      ecs.Secret.fromSecretsManager(dbSecret, field);

    // web は DB に触らない。secrets も渡さない
    const web = this.createService("Web", {
      repo: props.webRepo,
      imageTag: config.imageTag,
      port: WEB_PORT,
      desiredCount: config.webDesiredCount,
      environment: { PORT: String(WEB_PORT) },
      secrets: {},
    });
    this.webService = web.service;

    const api = this.createService("Api", {
      repo: props.apiRepo,
      imageTag: config.imageTag,
      port: API_PORT,
      desiredCount: config.apiDesiredCount,
      environment: { PORT: String(API_PORT) },
      secrets: {
        DB_HOST: dbSecretEntry("host"),
        DB_PORT: dbSecretEntry("port"),
        DB_USERNAME: dbSecretEntry("username"),
        DB_PASSWORD: dbSecretEntry("password"),
        DB_NAME: dbSecretEntry("dbname"),
      },
    });
    this.apiService = api.service;

    // DB の 5432 は api の SG だけに許可する
    // addIngressRule だとルールが DatabaseStack に置かれて循環参照になるため、
    // ServiceStack のリソースとして明示的に作る
    new ec2.CfnSecurityGroupIngress(this, "ApiToDb", {
      groupId: database.securityGroup.securityGroupId,
      sourceSecurityGroupId: api.securityGroup.securityGroupId,
      ipProtocol: "tcp",
      fromPort: DB_PORT,
      toPort: DB_PORT,
      description: `api to ${DB_NAME}`,
    });

    listener.addTargets("WebTargets", {
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: WEB_PORT,
      targets: [this.webService],
      healthCheck: { path: "/" },
    });
    listener.addTargets("ApiTargets", {
      priority: 10,
      conditions: [
        elbv2.ListenerCondition.pathPatterns([config.apiPathPattern]),
      ],
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: API_PORT,
      targets: [this.apiService],
      healthCheck: { path: "/health" },
    });

    this.autoScale(this.webService, config.maxTaskCount);
    this.autoScale(this.apiService, config.maxTaskCount);
  }

  private createService(
    id: string,
    options: {
      repo: ecr.IRepository;
      imageTag: string;
      port: number;
      desiredCount: number;
      environment: Record<string, string>;
      secrets: Record<string, ecs.Secret>;
    },
  ): { service: ecs.FargateService; securityGroup: ec2.SecurityGroup } {
    const taskDefinition = new ecs.FargateTaskDefinition(this, `${id}Task`, {
      cpu: TASK_CPU,
      memoryLimitMiB: TASK_MEMORY_MIB,
    });
    taskDefinition.addContainer(`${id}Container`, {
      image: ecs.ContainerImage.fromEcrRepository(
        options.repo,
        options.imageTag,
      ),
      portMappings: [{ containerPort: options.port }],
      environment: options.environment,
      secrets: options.secrets,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: id.toLowerCase(),
        logGroup: new logs.LogGroup(this, `${id}Logs`, {
          retention: logs.RetentionDays.ONE_MONTH,
        }),
      }),
    });

    const securityGroup = new ec2.SecurityGroup(this, `${id}SecurityGroup`, {
      vpc: this.cluster.vpc,
      description: `${id} Fargate tasks`,
    });
    const service = new ecs.FargateService(this, `${id}Service`, {
      cluster: this.cluster,
      taskDefinition,
      desiredCount: options.desiredCount,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [securityGroup],
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      // 起動に失敗し続けるデプロイを早く打ち切って、直前の状態に戻す
      circuitBreaker: { rollback: true },
    });
    return { service, securityGroup };
  }

  private autoScale(service: ecs.FargateService, maxTaskCount: number): void {
    const scaling = service.autoScaleTaskCount({
      minCapacity: MIN_DESIRED_COUNT,
      maxCapacity: maxTaskCount,
    });
    scaling.scaleOnCpuUtilization("Cpu", {
      targetUtilizationPercent: CPU_TARGET_PERCENT,
    });
  }
}
