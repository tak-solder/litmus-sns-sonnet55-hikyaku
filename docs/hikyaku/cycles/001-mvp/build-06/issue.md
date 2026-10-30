# Build 06: フォローと公開範囲API

## やること

- `follows` テーブル（`pending` / `accepted`、索引は `(followee_id, status, created_at desc, follower_id)` と `(follower_id, status)`）とマイグレーションを作る
- `PUT /users/:id/follow`（公開ユーザーはフォロー、非公開ユーザーはフォロー申請）、`DELETE /users/:id/follow`（フォロー解除・申請の取消）を実装する
- フォロー中と申請中の合計5,000人の上限を、行ロックつきのトランザクションで検査する。自分自身はフォローできない。ゲストは401
- `GET /users/:id`（名前・公開範囲・`relationship`・`can_view_posts`）を実装する。非公開ユーザーでも名前とフォロー（申請）ボタンに必要な情報は返す
- `PATCH /me` で公開範囲を切り替える。公開から非公開では既存の `accepted` を維持し、非公開から公開では同一トランザクションで `pending` を削除する

## やらないこと

- 申請の承認・拒否（build-07）、フォロワー一覧・外す（build-08）
- ユーザーページの投稿一覧（build-12）
- 投稿の可視性による表示制御そのもの（build-09 以降）

## 対応する受け入れ基準

- US-6.3, US-6.4, US-6.5, US-6.6, US-6.7, US-6.8, US-6.9, US-6.10, US-11.1, US-11.4, US-11.5

## 受け入れ基準

- [ ] 公開ユーザーをフォローでき、フォロー済みと分かり、解除できる
- [ ] 非公開ユーザーにはフォロー申請になり、申請中と分かり、申請者が取り消せる。本人が承認するまでフォロワーにならない
- [ ] 自分自身はフォローできず、ゲストはフォローできない（ユーザーページの閲覧はできる）
- [ ] フォロー中と申請中の合計が5,000人に達すると、それ以上は409でその旨が返る（同時リクエストでも超えない）
- [ ] 公開から非公開にしても既存のフォロワーが残り、非公開から公開にすると未処理の申請が破棄される
- [ ] 非公開ユーザーの `GET /users/:id` は、閲覧権の無い閲覧者に `can_view_posts: false` を返す

## 参照する設計ドキュメント

- design-delta.md「データモデル」「API」
- US-6 / US-11 の受け入れ基準

## BP見積もり

作成するファイル: `apps/api/src/db/schema/follows.ts`, `apps/api/drizzle/0003_follows.sql`, `apps/api/src/follows/service.ts`, `apps/api/src/routes/follows.ts`, `apps/api/src/routes/users-get.ts`, `apps/api/src/routes/me-patch.ts`, `apps/api/src/follows/service.test.ts`, `apps/api/src/routes/follows.test.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 8 | 3 |
| 実装行数（テスト含む） | 600 | 3 |
| API操作数 | 4 | 5（ベース） |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 1 | 2 |
| 影響ファイル数 | 3 | +0 |
| 合計 | | 5 |
