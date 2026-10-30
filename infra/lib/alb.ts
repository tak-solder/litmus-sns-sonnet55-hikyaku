import type * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { Construct } from "constructs";

// HTTPS の終端は CloudFront（build-24）。ここでは HTTP :80 だけを受ける。
// CloudFront 経由に限る制限は build-24 で足す
export function createAlb(
  scope: Construct,
  vpc: ec2.IVpc,
): {
  alb: elbv2.ApplicationLoadBalancer;
  listener: elbv2.ApplicationListener;
} {
  const alb = new elbv2.ApplicationLoadBalancer(scope, "Alb", {
    vpc,
    internetFacing: true,
  });
  const listener = alb.addListener("HttpListener", {
    port: 80,
    protocol: elbv2.ApplicationProtocol.HTTP,
    open: true,
  });
  return { alb, listener };
}
