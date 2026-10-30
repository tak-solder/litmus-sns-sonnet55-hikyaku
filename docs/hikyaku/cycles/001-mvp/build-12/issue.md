# Build 12: グローバルフィード・ユーザーページ投稿一覧API

## やること

- `GET /feed`（グローバルフィード）と `GET /users/:id/posts`（ユーザーページの投稿一覧）を実装する。閲覧者が見られる投稿を新しい順に1回最大20件、`cursor` で続きを返す
- 投稿一覧の共通部品（keyset ページング、投稿オブジェクトのバッチ組み立て、`is_liked_by_me` の一括取得）を作る。後続のタイムライン・検索が再利用する
- 非公開ユーザーの投稿は、本人とフォロワーにだけ表示する。ゲストにも使える（`is_liked_by_me` は false）
- 削除済みの投稿は除外する。画像付き投稿は画像 URL を含む

## やらないこと

- タイムライン（build-13）、検索（build-14）
- 一覧の画面（build-17, 19）

## 対応する受け入れ基準

- US-8.1, US-8.2, US-8.3, US-8.4, US-8.5, US-6.2, US-4.3, US-4.7, US-5.2

## 受け入れ基準

- [ ] グローバルフィードが新しい順に1回最大20件返り、続きを取得できる。投稿した内容が先頭に出る
- [ ] 各投稿に本文・画像・投稿日時・投稿者名・`like_count`・`is_liked_by_me` が含まれ、ゲストの `is_liked_by_me` はすべて false
- [ ] 非公開ユーザーの投稿は、本人とフォロワーにだけ表示され、ゲストには表示されない
- [ ] ユーザーページの投稿一覧が、閲覧者が見られる投稿だけを新しい順に返す
- [ ] 削除した投稿はどちらの一覧にも出ない
- [ ] 画像付き投稿は画像 URL を含む

## 参照する設計ドキュメント

- design-delta.md「API（一覧系）」
- ADR: `20261030-timeline-fan-out-on-read.md`

## BP見積もり

作成するファイル: `apps/api/src/posts/list.ts`, `apps/api/src/posts/cursor.ts`, `apps/api/src/posts/hydrate.ts`, `apps/api/src/routes/feed.ts`, `apps/api/src/routes/user-posts.ts`, `apps/api/src/posts/list.test.ts`, `apps/api/src/routes/feed.test.ts`, `packages/shared/src/list.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 8 | 3（ベース） |
| 実装行数（テスト含む） | 600 | 3 |
| API操作数 | 2 | 3 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 4 | +1 |
| 合計 | | 4 |
