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
| `follows` | follower_id, followee_id, status(`pending`/`accepted`), created_at | 主キー `(follower_id, followee_id)`。索引: `(followee_id, status, created_at desc)` |
| `likes` | user_id, post_id, created_at | 主キー `(user_id, post_id)`。重複を DB で拒否 |

- 投稿の削除は `deleted_at` による論理削除とし、一覧・検索・単体ページで除外する
- フォロー中と申請中の合計 5,000 人の上限は、フォロー・申請の作成トランザクション内で検査する（同一ユーザーの行をロックして二重取得を防ぐ）
- 公開から非公開にしても `accepted` は維持する。非公開から公開にしたとき、`pending` の行を同一トランザクションで削除する
- 投稿を見られる条件は、1つの可視性述語（作者が `public`、または閲覧者が作者本人、または閲覧者が作者の `accepted` フォロワー）に集約し、全一覧・検索・単体ページで同じ述語を使う。公開範囲はユーザー単位なので、変更は過去の投稿にも即時に反映される

### API（REST + OpenAPI）

- 認証: `Authorization: Bearer <token>`。ゲストでも呼べる読み取り API は、トークンがあればログインユーザーとして扱う
- 一覧系（グローバルフィード・タイムライン・検索・ユーザーページ・フォロー申請一覧・フォロワー一覧）は、`limit`（最大20）と `cursor`（直前の最後の ID）を受け、`items` と `next_cursor` を返す
- 投稿オブジェクト: 本文・画像 URL・投稿日時・投稿者（id と名前）・`like_count`・`is_liked_by_me`（ゲストは常に false）
- エラー: `{ "error": { "code": "...", "message": "...", "fields": {...} } }` の形式で統一し、HTTP ステータスで種別を表す（400 入力不正 / 401 要ログイン / 403 権限なし / 404 不在・見えない投稿 / 409 競合・上限）。見られない投稿の存在を漏らさないため、単体ページは 404 とする
- 画像: クライアントが API で署名付き URL を取得して S3 に直接 PUT し、投稿作成時に `image_key` を渡す。サーバーは S3 上のオブジェクトの形式（マジックバイト）とサイズ（5MB）を検証してから投稿を確定する。配信は CloudFront 経由
- いいね数は `posts.like_count` に持ち、いいねの追加・取り消しと同一トランザクションで更新する

### 検索

検索クエリのパーサーを `packages/*` に置き、入力を AST に変換する。仕様は US-10 のとおり（空白区切り AND、`OR` は AND より強く結合、大文字の `OR` のみ演算子、`-` 除外、`"..."` フレーズ、`-"..."` フレーズ除外、閉じていない `"`・端の `OR`・記号だけの `-` は通常文字）。検索語と `search_text` はともに NFKC 正規化 + 小文字化し、AST を `LIKE` 条件に変換する。`LIKE` のワイルドカード文字はエスケープする。

### 認証・メール

- 登録後、確認メールを送る。確認が済むまでログインは拒否し、確認が必要な旨を返す。確認メールの再送 API を持つ
- パスワードリセット後は、そのユーザーの既存セッションをすべて失効させる
- メールは SMTP（nodemailer）で送る。ローカルは Mailpit、本番は SES
- ログイン・登録・リセット要求などの認証系はレート制限をかける（ブルートフォースとメール乱用の対策）

### 単体ページの集中対策

CloudFront はゲスト（Authorization なし）の公開投稿の取得 `GET /posts/:id` を TTL 10 秒でキャッシュする。API は、ゲストへの公開投稿の応答にだけ `Cache-Control: public, s-maxage=10` を付け、それ以外には `private, no-store` を付ける。投稿の削除と、作者の公開範囲を非公開にしたときは、CloudFront の該当 URL を無効化する。web の単体ページは投稿本体を静的に描画し、`is_liked_by_me` などの個人別の状態は別リクエストで取得する。

### ローカル開発

`docker compose up` ですべてが起動する。`compose.yaml` に `db`（PostgreSQL + pg_bigm）、`mailpit`、`minio`、マイグレーションの実行を足す。

### 本番構成（`infra/`）

ECS Fargate（web / api、オートスケール）、RDS PostgreSQL（Multi-AZ）、S3、CloudFront、SES、ALB、VPC、Secrets Manager をコードで定義する。月額 300 米ドルの目安に収まる小さな構成から始め、台数とインスタンスサイズで段階的に増強する。

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
