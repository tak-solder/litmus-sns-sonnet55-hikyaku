# Build 26: APIエラー形式・OpenAPI・クライアント生成 質問

## Q1: BP を再算出したら 7BP（`bpMax − 2` 以上）になった。分割するか（G6）
**回答**: 分割せず、7BP のまま続行する。

委任された判断（監督）。根拠: 7BP は上限 8 以内。`shutdown.ts` と `loadConfig` 化を切り出しても build-26 は 7BP のままで、切り出した側は 1BP にしかならず、PR とセッションが増えるだけ。データ安全上の問題もない（開発基盤とエラー形式の追加のみ）。「分割コストが大きい場合」の例外を監督判断で適用した。あわせて、次の plan.md の修正を指示された: BP 内訳を 7BP に直す / `loadConfig` 化で `DATABASE_URL` が起動に必須になる点をデータ安全に書く / `/openapi.json` のキャッシュ方式 / `HTTPException` の status と `ErrorCode` の対応規則 / `generate:api-client` の引数と出力パスの解決。`/openapi.json` は公開を前提に進めてよい。
