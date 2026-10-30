import { pathToFileURL } from "node:url";
import { App } from "aws-cdk-lib";
import { loadConfig } from "../lib/config.js";
import { DatabaseStack } from "../lib/database-stack.js";
import { EcrStack } from "../lib/ecr-stack.js";
import { NetworkStack } from "../lib/network-stack.js";
import { ServiceStack } from "../lib/service-stack.js";

export function createApp(app = new App()): App {
  const config = loadConfig(app);
  const env = config.env;

  const network = new NetworkStack(app, "LitmusNetwork", { env });
  const ecr = new EcrStack(app, "LitmusEcr", { env });
  const database = new DatabaseStack(app, "LitmusDatabase", {
    env,
    vpc: network.vpc,
    config,
  });
  new ServiceStack(app, "LitmusService", {
    env,
    vpc: network.vpc,
    config,
    webRepo: ecr.webRepo,
    apiRepo: ecr.apiRepo,
    database,
  });
  return app;
}

// `cdk synth` からの実行時だけ合成する（テストから import しても動かない）
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  createApp().synth();
}
