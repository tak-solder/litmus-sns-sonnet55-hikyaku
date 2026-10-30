# 設計段階の質問

回答は人間ではなく監督が委任されて下した判断（G3）。根拠は user-stories.md の制約（モバイルからも使える API、OpenAPI 等の仕様書が成果物、検索 3 秒以内、ECS + PostgreSQL 必須、AWS 月額 300 米ドル目安、インフラのコードは Terraform / CDK など）と各推奨案が矛盾せず、いずれも要件を広げず費用・運用が最小の案であること。

### Q1: API の方式（D1）
**回答**: A（REST + OpenAPI）。web は Next.js サーバー側から API を呼ぶ BFF

### Q2: 認証方式（D2）
**回答**: A（DB 保存の不透明セッショントークン。web はクッキー、モバイルは Bearer）

### Q3: タイムラインの生成方式（D3）
**回答**: A（読み取り時に生成。keyset ページング）

### Q4: 検索の方式（D4）
**回答**: A（PostgreSQL + pg_bigm）

### Q5: 単体ページへのアクセス集中への備え（D5）
**回答**: A（CloudFront でゲストの公開投稿だけを短 TTL キャッシュ + 無効化）

### Q6: インフラのコードの言語（D6）
**回答**: AWS CDK（TypeScript）
