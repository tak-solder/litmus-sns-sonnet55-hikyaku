import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import type { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";
import type { EnvConfig } from "./config.js";

export const DB_NAME = "litmus_sns";
const DB_USERNAME = "app";

export type DatabaseStackProps = StackProps & {
  vpc: ec2.IVpc;
  config: EnvConfig;
};

export class DatabaseStack extends Stack {
  readonly instance: rds.DatabaseInstance;
  readonly secret: ISecret;
  // ingress 無しで作る。5432 の許可は ServiceStack が足す（スタック間の循環参照を避ける）
  readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_17,
    });

    this.securityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: props.vpc,
      description: "RDS PostgreSQL",
      allowAllOutbound: false,
    });

    // pg_bigm は shared_preload_libraries に入れない。マイグレーションの
    // CREATE EXTENSION で有効にする（RDS のサポートは未検証）
    const parameterGroup = new rds.ParameterGroup(this, "ParameterGroup", {
      engine,
      description: "litmus-sns PostgreSQL 17",
      parameters: { "rds.force_ssl": "1" },
    });

    this.instance = new rds.DatabaseInstance(this, "Instance", {
      engine,
      instanceType: new ec2.InstanceType(props.config.dbInstanceClass),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this.securityGroup],
      multiAz: true,
      publiclyAccessible: false,
      databaseName: DB_NAME,
      credentials: rds.Credentials.fromGeneratedSecret(DB_USERNAME),
      parameterGroup,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      backupRetention: Duration.days(7),
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // 生成した Secret は必ずある（fromGeneratedSecret を渡している）
    this.secret = this.instance.secret as ISecret;
  }
}
