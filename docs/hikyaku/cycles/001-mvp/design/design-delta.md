# 設計差分

## このサイクルで作るもの

リポジトリは初期構築のみのため、すべてが新規。判断の理由は ADR（`docs/hikyaku/decisions/20261030-*.md`）にある。

### 全体構成

```
ブラウザ ─→ CloudFront ─→ web（Next.js, ECS） ─→ api（Hono, ECS） ─→ PostgreSQL（RDS）
                    └──→ api（公開投稿の取得のみキャッシュ）          └→ S3（画像） / SES（メール）
モバイル（将来）────────→ api（Bearer）
```

- `apps/web` は UI と BFF。API の生成クライアント経由でだけデータを取得し、DB には触らない。ログインのセッショントークンは httpOnly クッキーに持ち、API へ Bearer として転送する
- `apps/api` はすべての業務ロジックと認可を持つ。web もモバイルも同じ API を使う
- `packages/*` に web と api の共有物を置く。`shared`（zod スキーマ・定数: 本文300文字、画像5MB、フォロー上限5,000）と、検索クエリのパーサー
- `infra/` に AWS CDK（TypeScript）で本番構成を定義する

### データモデル（PostgreSQL / Drizzle）

| テーブル | 主な列 | 備考 |
|---|---|---|
| `users` | id(UUIDv7), name, email(正規化・一意), password_hash, email_verified_at, visibility(`public`/`private`), created_at | 登録直後は `public` |
| `sessions` | id, user_id, token_hash(一意), expires_at | 不透明トークンのハッシュのみ保存 |
| `email_tokens` | id, user_id, kind(`verify`/`reset`), token_hash, expires_at, used_at | 使い切り |
| `posts` | id(UUIDv7), author_id, body, image_key, search_text, like_count, created_at, deleted_at | 索引: `(author_id, id desc)`、`id desc`、`search_text` の pg_bigm GIN |
| `follows` | follower_id, followee_id, status(`pending`/`accepted`), created_at | 主キー `(follower_id, followee_id)`。索引: `(followee_id, status, created_at desc, follower_id)`、`(follower_id, status)` |
| `likes` | user_id, post_id, created_at | 主キー `(user_id, post_id)`。重複を DB で拒否 |

- 投稿の削除は `deleted_at` による論理削除とし、一覧・検索・単体ページで除外する
- フォロー中と申請中の合計 5,000 人の上限は、フォロー・申請の作成トランザクション内で検査する（同一ユーザーの行をロックして二重取得を防ぐ）
- 公開から非公開にしても `accepted` は維持する。非公開から公開にしたとき、`pending` の行を同一トランザクションで削除する
- 投稿を見られる条件は、1つの可視性述語（作者が `public`、または閲覧者が作者本人、または閲覧者が作者の `accepted` フォロワー）に集約し、全一覧・検索・単体ページで同じ述語を使う。公開範囲はユーザー単位なので、変更は過去の投稿にも即時に反映される

### API（REST + OpenAPI）

- 認証: `Authorization: Bearer <token>`。ゲストでも呼べる読み取り API は、トークンがあればログインユーザーとして扱う
- 一覧系（グローバルフィード・タイムライン・検索・ユーザーページ・フォロー申請一覧・フォロワー一覧）は、`limit`（最大20）と `cursor` を受け、`items` と `next_cursor` を返す。カーソルは不透明な文字列で、投稿系は直前の最後の投稿 ID、フォロー申請一覧とフォロワー一覧は `(created_at, 相手ユーザー ID)` の組を符号化したもの（同一時刻の取りこぼしを防ぐため、`follows` の索引は `(followee_id, status, created_at desc, follower_id)` とする）
- ユーザーオブジェクト: `id`, `name`, `visibility`, `relationship`（`self` / `none` / `following` / `requested` の4値。ゲストは `none`）, `can_view_posts`（閲覧者がこのユーザーの投稿を見られるか。false なら UI は非公開表示にする）。ログインユーザー自身の取得 `GET /me` は `visibility` とメール確認状態を含む
- 操作の一覧（主なもの）: `POST /users`（登録）、`POST /email-verifications` と確認、`POST /sessions` / `DELETE /sessions`、`POST /password-resets` と実行、`POST /posts` / `DELETE /posts/:id`、`PUT` / `DELETE /posts/:id/like`、`GET /users/:id` と `GET /users/:id/posts`、`PUT` / `DELETE /users/:id/follow`（フォロー・申請・解除・取消）、`GET /me/follow-requests`、`POST /me/follow-requests/:userId/approve` / `reject`、`GET /me/followers`、`DELETE /me/followers/:userId`、`PATCH /me`（公開範囲）、`GET /timeline` / `/feed` / `/search`。詳細は OpenAPI を正とする
- 見えない投稿（非公開ユーザーの投稿で閲覧権が無い）への操作は、いいねを含めて 404 を返す。可視性述語は読み取りに限らず、投稿を対象とする全操作で使う
- 投稿オブジェクト: 本文・画像 URL・投稿日時・投稿者（id と名前）・`like_count`・`is_liked_by_me`（ゲストは常に false）
- エラー: `{ "error": { "code": "...", "message": "...", "fields": {...} } }` の形式で統一し、HTTP ステータスで種別を表す（400 入力不正 / 401 要ログイン / 403 権限なし / 404 不在・見えない投稿 / 409 競合・上限）。見られない投稿の存在を漏らさないため、単体ページは 404 とする
- 画像: クライアントが API で署名付き URL（Content-Type と最大サイズを条件に含む）を取得し、`pending/{user_id}/{ランダム UUID}` に S3 へ直接 PUT する。`pending/` は CloudFront から配信しない。投稿作成時に `image_key` を渡すと、サーバーは key が本人の `pending/{user_id}/` 配下であること、形式（マジックバイト）、サイズ（5MB）を検証し、通ったものだけを `images/{ランダム UUID}` へコピーして確定する。配信は CloudFront 経由で `images/` のみ。key は推測困難な 128bit の UUID とし、可視性による画像単位の認可は行わない（URL を知る者には見える。非公開ユーザーの画像が URL 経由で見えうることは既知の制約として `constraints` に残す）。投稿の削除時は画像も削除する
- いいね数は `posts.like_count` に持ち、いいねの追加・取り消しと同一トランザクションで更新する

### 検索

検索クエリのパーサーを `packages/*` に置き、入力を AST に変換する。仕様は US-10 のとおり（空白区切り AND、`OR` は AND より強く結合、大文字の `OR` のみ演算子、`-` 除外、`"..."` フレーズ、`-"..."` フレーズ除外、閉じていない `"`・端の `OR`・記号だけの `-` は通常文字）。検索語と `search_text` はともに NFKC 正規化 + 小文字化し、AST を `LIKE` 条件に変換する。`LIKE` のワイルドカード文字はエスケープする。

### 認証・メール

- 登録後、確認メールを送る。確認が済むまでログインは拒否し、確認が必要な旨を返す。確認メールの再送 API を持つ
- パスワードリセット後は、そのユーザーの既存セッションをすべて失効させる
- メールは SMTP（nodemailer）で送る。ローカルは Mailpit、本番は SES
- ログイン・登録・リセット要求・確認メール再送はレート制限をかける（ブルートフォースとメール乱用の対策）。ECS は複数タスクで動くため、カウンタは PostgreSQL の専用テーブルに持つ（IP とメールアドレスをキーにする）。追加サービスは入れない
- アカウントの存在を漏らさない: パスワードリセット要求は登録の有無にかかわらず同じ応答にする。重複登録は、登録済みアドレスへ「登録済み」を知らせるメールを送り、応答は新規登録と同じにする。ログインは、パスワードが正しい場合にだけ「確認が必要」を返す
- セッションクッキーは `HttpOnly; Secure; SameSite=Lax`、有効期限30日（利用ごとに延長）。状態を変える web のリクエストは Origin ヘッダを検証して CSRF を防ぐ

### 単体ページの集中対策

CloudFront は web と api の両方の前段に置き、次の2つをゲスト（セッションクッキー・Authorization なし）に限って TTL 10 秒でキャッシュする。web の単体ページ HTML（`/posts/:id`）と、api の `GET /posts/:id`。キャッシュポリシーはセッションクッキーを含めたキーで分け、クッキーがある（ログイン中の）リクエストと非公開ユーザーの投稿の応答には `Cache-Control: private, no-store` を付けるので、ログインユーザーが共有キャッシュを読み書きすることはない。web の単体ページはゲスト向けの投稿本体を描画し、`is_liked_by_me` などの個人別の状態は別リクエストで取得する。

無効化の対象は次のとおり。投稿の削除は該当する単体ページと API の 2 URL を無効化する。作者が公開範囲を非公開にしたときは、投稿 URL を列挙せず、ワイルドカードパス `/posts/*`（1 パスとして数える）を無効化する。公開範囲の変更は低頻度なので、キャッシュ全体を落とすコストは許容する。無効化の API 呼び出しが失敗した場合は、ジョブ（DB の再試行キュー）で再試行し、その間も TTL の 10 秒で必ず古い表示は消える。**ゲストが削除・非公開化後も最大 10 秒、古い表示を見うること**は、US-5.2 / 11.3 に対する既知の逸脱で、この設計の合意事項として PR レビューで確認する。

### ローカル開発

`docker compose up` ですべてが起動する。`compose.yaml` に `db`（PostgreSQL + pg_bigm）、`mailpit`、`minio`、マイグレーションの実行を足す。

### 本番構成（`infra/`）

ECS Fargate（web / api、オートスケール）、RDS PostgreSQL（Multi-AZ）、S3、CloudFront、SES、ALB、VPC、Secrets Manager をコードで定義する。月額 300 米ドルの目安に収まる小さな構成から始め、台数とインスタンスサイズで段階的に増強する。

99.9% を満たすため、web / api は各 2 タスク以上を 2 つの AZ に分散し、RDS は Multi-AZ とする。概算（東京、月額）は、Fargate 4 タスク（0.5 vCPU / 1GB）で約 70 米ドル、RDS db.t4g.medium の Multi-AZ で約 120 米ドル、ALB で約 25 米ドル、NAT Gateway で約 45 米ドル、S3 / CloudFront / SES / ログで約 20 米ドルで、合計約 280 米ドル。この見積もりは構築ビルドで実測して見直す。

### CI/CD と開発体制

GitHub Actions で、プルリクエストごとに typecheck / lint（Biome）/ テスト（Vitest、実 PostgreSQL）/ マイグレーションの検証 / OpenAPI 仕様と生成クライアントの差分確認を実行する。main へのマージで、イメージのビルドと ECR への push、マイグレーションの適用（デプロイ前の 1 回限りの ECS タスク）、ECS のローリングデプロイを行い、CDK の変更は `cdk diff` を確認してから適用する。マイグレーションは前方互換（追加 → 切り替え → 削除の段階）にして、ローリングデプロイ中の新旧混在でも壊れないようにする。

### 画面と国際化

UI は日本語のみ。日時は UTC で保存し、表示時に日本時間へ変換する。画面は PC とスマートフォンの幅の両方に対応するレスポンシブとする。

## 永続ドキュメントの更新予定

- `overview`: 新規作成。全体構成、web と api の責務の境界、データフロー、データモデル
- `decisions`: 本サイクルの ADR 6 件を `accepted` から `implemented` へ更新
- `constraints`: 新規作成。非機能要件（規模・応答時間・可用性・費用）と、タイムラインの性能テストで確認した結果
- `conventions`: 新規作成。ディレクトリ構成、命名、エラー形式、テストの方針
- `security-model`: 新規作成（または constraints に統合）。セッション認証、トークン管理、可視性述語、レート制限
- `interfaces`: 新規作成。OpenAPI 仕様書へのポインタ
- `db-schema`: 新規作成。マイグレーションへのポインタ

## 既存構造への影響

- `apps/api/src/app.ts`: 業務ルートのマウント先になる。`/health` は維持する
- `apps/web/app/`: create-next-app の初期画面を置き換える
- `pnpm-workspace.yaml`: `packages/*` と `infra` を追加する
- `compose.yaml` と `docker/Dockerfile.dev`: 依存サービスの追加と、新しい package.json の COPY が要る
- 本番データはまだ存在せず、最初のマイグレーションは空の DB への作成になる。以降のマイグレーションは、追加 → 書き込みの切り替え → 旧形式の削除の順に、1 ビルドごとに安全な単位で行う
