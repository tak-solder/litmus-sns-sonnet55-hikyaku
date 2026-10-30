# Build 11: いいねAPI

## やること

- `likes` テーブル（主キー `(user_id, post_id)`）とマイグレーションを作る
- `PUT /posts/:id/like`（いいね）、`DELETE /posts/:id/like`（取り消し）を実装する。`posts.like_count` を同一トランザクションで増減させる
- 自分の投稿へのいいねは拒否、重複は拒否（DB の主キーで担保）、ゲストは401。見えない投稿（非公開ユーザーの投稿で閲覧権が無い）は404
- 投稿オブジェクトの `is_liked_by_me` を実値にする（ゲストは常に false）

## やらないこと

- いいねの画面（build-17, 18）
- いいね数の再集計バッチ

## 対応する受け入れ基準

- US-7.1, US-7.2, US-7.3, US-7.4, US-7.5

## 受け入れ基準

- [ ] 他人の投稿にいいねすると `like_count` が1増え、`is_liked_by_me` が true になる
- [ ] 取り消すと1減り、`is_liked_by_me` が false になる
- [ ] 同じ投稿に重複していいねできず、同時リクエストでも `like_count` は1人につき最大1
- [ ] 自分の投稿にはいいねできない。ゲストはいいねできない
- [ ] 見えない投稿へのいいねは404になる

## 参照する設計ドキュメント

- design-delta.md「データモデル」「API（見えない投稿は404）」

## BP見積もり

作成するファイル: `apps/api/src/db/schema/likes.ts`, `apps/api/drizzle/0005_likes.sql`, `apps/api/src/posts/likes.ts`, `apps/api/src/routes/likes.ts`, `apps/api/src/posts/likes.test.ts`, `apps/api/src/routes/likes.test.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 6 | 3（ベース） |
| 実装行数（テスト含む） | 400 | 2 |
| API操作数 | 2 | 3 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 1 | 2 |
| 影響ファイル数 | 3 | +0 |
| 合計 | | 3 |
