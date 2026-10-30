# Build 09: 投稿API（作成・削除・単体取得）と可視性述語

## やること

- `posts` テーブル（本文・`image_key`・`search_text`・`like_count`・`deleted_at`）、索引 `(author_id, id desc)` と `id desc`、マイグレーションを作る
- 可視性述語（作者が `public`、または閲覧者が本人、または閲覧者が作者の `accepted` フォロワー）を、一覧・検索・単体取得・いいねなど全操作で共通に使えるクエリ部品として作る
- `POST /posts`（本文のみ。300文字以内。空白・改行だけは本文なし。本文も画像も無ければ400）、`DELETE /posts/:id`（自分の投稿の論理削除）、`GET /posts/:id`（単体取得。見えない・削除済みは404）を実装する
- `search_text` を本文の NFKC 正規化 + 小文字化で保存時に生成する。投稿オブジェクト（本文・投稿日時・投稿者・`like_count`・`is_liked_by_me`・画像 URL）の定義を `packages/shared` に置く
- ゲストの投稿は401

## やらないこと

- 画像の添付（build-10）、いいね（build-11）。`is_liked_by_me` は常に false を返す（build-11 で実値にする）
- 各種一覧（build-12 以降）、検索の索引（build-14）
- CDN の Cache-Control（build-22）

## 対応する受け入れ基準

- US-4.1, US-4.2, US-4.4, US-5.1, US-5.2, US-11.2, US-11.3, US-12.2

## 受け入れ基準

- [ ] 300文字以内のテキストだけで投稿でき、空白だけ・301文字以上は400で理由が返る。ゲストは401
- [ ] 自分の投稿を削除でき、削除後は単体取得で404になる。他人の投稿は削除できない
- [ ] 非公開ユーザーの投稿は、本人とそのフォロワーだけが単体取得でき、ゲストやそれ以外は404になる
- [ ] 公開範囲の変更は、過去の投稿の単体取得に即時に反映される
- [ ] 単体取得の応答に本文・投稿日時・投稿者名・`like_count`・`is_liked_by_me` が含まれる

## 参照する設計ドキュメント

- design-delta.md「データモデル」「API（見えない投稿は404）」「検索（search_text）」
- ADR: `20261030-timeline-fan-out-on-read.md`

## BP見積もり

作成するファイル: `apps/api/src/db/schema/posts.ts`, `apps/api/drizzle/0004_posts.sql`, `apps/api/src/posts/visibility.ts`, `apps/api/src/posts/service.ts`, `apps/api/src/posts/serializer.ts`, `apps/api/src/routes/posts.ts`, `packages/shared/src/post.ts`, `apps/api/src/posts/visibility.test.ts`, `apps/api/src/routes/posts.test.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 9 | 3 |
| 実装行数（テスト含む） | 700 | 3 |
| API操作数 | 3 | 5（ベース） |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 1 | 2 |
| 影響ファイル数 | 3 | +0 |
| 合計 | | 5 |
