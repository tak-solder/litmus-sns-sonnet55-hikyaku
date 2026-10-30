export type Config = { databaseUrl: string; port: number };

const DEFAULT_PORT = 8080;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL が設定されていません");
  }

  return { databaseUrl, port: parsePort(env.PORT) };
}

function parsePort(value: string | undefined): number {
  if (value === undefined) return DEFAULT_PORT;

  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new Error(`PORT は 1〜65535 の整数で指定してください: "${value}"`);
  }
  return port;
}
