import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const url = "postgres://postgres:postgres@localhost:5432/app";

describe("loadConfig", () => {
  it("DATABASE_URL と PORT を指定した場合は指定値を返す", () => {
    expect(loadConfig({ DATABASE_URL: url, PORT: "3000" })).toEqual({ databaseUrl: url, port: 3000 });
  });

  it("PORT 未指定なら既定値 8080 を使う", () => {
    expect(loadConfig({ DATABASE_URL: url }).port).toBe(8080);
  });

  it("DATABASE_URL が無ければ DATABASE_URL を示すメッセージで例外にする", () => {
    expect(() => loadConfig({ PORT: "3000" })).toThrow(/DATABASE_URL/);
  });

  it("DATABASE_URL が空文字なら例外にする", () => {
    expect(() => loadConfig({ DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
  });

  it("PORT が数値でない場合は例外にする", () => {
    expect(() => loadConfig({ DATABASE_URL: url, PORT: "abc" })).toThrow(/PORT/);
  });

  it.each(["0", "65536", "-1", "3000abc", ""])("PORT が %j なら例外にする", (port) => {
    expect(() => loadConfig({ DATABASE_URL: url, PORT: port })).toThrow(/PORT/);
  });

  it.each(["1", "65535"])("PORT が %j なら数値で返す", (port) => {
    expect(loadConfig({ DATABASE_URL: url, PORT: port }).port).toBe(Number(port));
  });
});
