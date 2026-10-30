---
status: accepted
---

# API の方式は REST + OpenAPI とする

- **決定**: Hono + zod-openapi で REST API を定義し、OpenAPI 仕様書と web 用の型付きクライアントをそこから生成する。web は Next.js のサーバー側から API を呼ぶ BFF とし、DB には直接触らない
- **文脈**: 将来のモバイルアプリからも使える API が要件で、API 仕様書が MVP の成果物。web と API の処理の共有のしかたも決める必要があった
- **検討した案**:
  - 案A: REST + OpenAPI
  - 案B: GraphQL
  - 案C: tRPC
- **採用理由**: 仕様書の成果物要件を直接満たし、モバイルが標準の HTTP で使える。CloudFront によるキャッシュ（単体ページ集中対策）とも相性が良い
- **トレードオフ**: エンドポイントごとに定義が増えて冗長になる。画面ごとの取得項目の最適化はできず、必要になれば専用のレスポンスを足す。GraphQL は、ページング・認可・N+1 対策・CDN キャッシュが難しく MVP には過剰として退けた。tRPC は TS 以外のクライアントから使いにくく、仕様書も別に要るため退けた
- **影響範囲**: `apps/api`、`apps/web`、型・スキーマ共有の `packages/*`、API 仕様書
