import type { App } from "aws-cdk-lib";

export type EnvConfig = {
  env: { account?: string; region: string };
  webDesiredCount: number;
  apiDesiredCount: number;
  maxTaskCount: number;
  dbInstanceClass: string;
  apiPathPattern: string;
  imageTag: string;
};

export const MIN_DESIRED_COUNT = 2;

const DEFAULTS = {
  region: "ap-northeast-1",
  webDesiredCount: 2,
  apiDesiredCount: 2,
  maxTaskCount: 6,
  dbInstanceClass: "t4g.medium",
  apiPathPattern: "/api/*",
  imageTag: "latest",
} as const;

// context（`cdk synth -c key=value` を含む）から設定を読む。
// CLI の値は文字列で来るので、数値は変換して検証する
export function loadConfig(app: App): EnvConfig {
  const webDesiredCount = readInteger(
    app,
    "webDesiredCount",
    DEFAULTS.webDesiredCount,
  );
  const apiDesiredCount = readInteger(
    app,
    "apiDesiredCount",
    DEFAULTS.apiDesiredCount,
  );
  if (webDesiredCount < MIN_DESIRED_COUNT) {
    throw new Error(
      `webDesiredCount は ${MIN_DESIRED_COUNT} 以上にしてください（2 AZ 分散のため）: ${webDesiredCount}`,
    );
  }
  if (apiDesiredCount < MIN_DESIRED_COUNT) {
    throw new Error(
      `apiDesiredCount は ${MIN_DESIRED_COUNT} 以上にしてください（2 AZ 分散のため）: ${apiDesiredCount}`,
    );
  }

  const maxTaskCount = readInteger(app, "maxTaskCount", DEFAULTS.maxTaskCount);
  if (maxTaskCount < Math.max(webDesiredCount, apiDesiredCount)) {
    throw new Error(
      `maxTaskCount は desiredCount 以上にしてください: ${maxTaskCount}`,
    );
  }

  const imageTag = readString(app, "imageTag", DEFAULTS.imageTag);
  if (imageTag === "") {
    throw new Error("imageTag を空にはできません");
  }

  return {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: readString(app, "region", DEFAULTS.region),
    },
    webDesiredCount,
    apiDesiredCount,
    maxTaskCount,
    dbInstanceClass: readString(
      app,
      "dbInstanceClass",
      DEFAULTS.dbInstanceClass,
    ),
    apiPathPattern: readString(app, "apiPathPattern", DEFAULTS.apiPathPattern),
    imageTag,
  };
}

function readString(app: App, key: string, fallback: string): string {
  const value: unknown = app.node.tryGetContext(key);
  if (value === undefined) return fallback;
  return String(value);
}

function readInteger(app: App, key: string, fallback: number): number {
  const value: unknown = app.node.tryGetContext(key);
  if (value === undefined) return fallback;

  const text = String(value);
  if (!/^-?\d+$/.test(text)) {
    throw new Error(`${key} は整数で指定してください: "${text}"`);
  }
  return Number(text);
}
