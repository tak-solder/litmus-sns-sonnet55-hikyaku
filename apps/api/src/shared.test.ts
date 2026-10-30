import {
  ERROR_CODES,
  ERROR_STATUS,
  errorResponseSchema,
  FOLLOW_LIMIT,
  IMAGE_MAX_BYTES,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  POST_BODY_MAX_LENGTH,
} from "@litmus-sns/shared";
import { describe, expect, it } from "vitest";

describe("constants", () => {
  it("設計で決めた値を持つ", () => {
    expect(POST_BODY_MAX_LENGTH).toBe(300);
    expect(IMAGE_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(FOLLOW_LIMIT).toBe(5000);
    expect(PAGE_SIZE_DEFAULT).toBe(20);
    expect(PAGE_SIZE_MAX).toBe(20);
  });

  it("すべて正の整数である", () => {
    for (const value of [
      POST_BODY_MAX_LENGTH,
      IMAGE_MAX_BYTES,
      FOLLOW_LIMIT,
      PAGE_SIZE_DEFAULT,
      PAGE_SIZE_MAX,
    ]) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe("ERROR_CODES / ERROR_STATUS", () => {
  it("6 種のコードを持つ", () => {
    expect([...ERROR_CODES]).toEqual([
      "validation_error",
      "unauthorized",
      "forbidden",
      "not_found",
      "conflict",
      "internal_error",
    ]);
  });

  it("コードごとに HTTP ステータスが対応する", () => {
    expect(ERROR_STATUS).toEqual({
      validation_error: 400,
      unauthorized: 401,
      forbidden: 403,
      not_found: 404,
      conflict: 409,
      internal_error: 500,
    });
  });

  it("ERROR_STATUS のキーは ERROR_CODES と一致する", () => {
    expect(Object.keys(ERROR_STATUS).sort()).toEqual([...ERROR_CODES].sort());
  });
});

describe("errorResponseSchema", () => {
  it.each(ERROR_CODES)("%s を受理する", (code) => {
    const result = errorResponseSchema.safeParse({
      error: { code, message: "m", fields: {} },
    });
    expect(result.success).toBe(true);
  });

  it("fields にフィールドごとのメッセージ配列を持てる", () => {
    const result = errorResponseSchema.safeParse({
      error: {
        code: "validation_error",
        message: "入力が不正です",
        fields: { body: ["300 文字以内で入力してください"] },
      },
    });
    expect(result.success).toBe(true);
  });

  it("未定義のコードを拒否する", () => {
    const result = errorResponseSchema.safeParse({
      error: { code: "teapot", message: "m", fields: {} },
    });
    expect(result.success).toBe(false);
  });

  it("fields の欠落を拒否する", () => {
    const result = errorResponseSchema.safeParse({
      error: { code: "not_found", message: "m" },
    });
    expect(result.success).toBe(false);
  });

  it("message の欠落を拒否する", () => {
    const result = errorResponseSchema.safeParse({
      error: { code: "not_found", fields: {} },
    });
    expect(result.success).toBe(false);
  });

  it("fields の値が配列でなければ拒否する", () => {
    const result = errorResponseSchema.safeParse({
      error: { code: "conflict", message: "m", fields: { a: "x" } },
    });
    expect(result.success).toBe(false);
  });
});
