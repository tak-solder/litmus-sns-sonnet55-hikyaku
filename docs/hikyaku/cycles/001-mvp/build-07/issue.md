# Build 07: フォロー申請の承認・拒否API

## やること

- `GET /me/follow-requests`（自分宛ての未処理の申請を、申請者の名前つきで、申請日時の新しい順に1回最大20件・複合カーソルで返す）
- `POST /me/follow-requests/:userId/approve`（申請を `accepted` にする）、`.../reject`（申請を削除する）
- 申請者は拒否後に改めて申請できる

## やらないこと

- フォロワー一覧・外す（build-08）
- 申請の画面（build-20）

## 対応する受け入れ基準

- US-13.1, US-13.2, US-13.3

## 受け入れ基準

- [ ] 自分宛ての未処理の申請が、申請者の名前つきで新しい順に1回最大20件返り、続きを取得できる（同一時刻の申請を取りこぼさない）
- [ ] 承認すると申請者が自分のフォロワーになり、自分の投稿が見られるようになる
- [ ] 拒否すると申請が消え、申請者は改めて申請できる
- [ ] 他人の申請は操作できない

## 参照する設計ドキュメント

- design-delta.md「データモデル（follows）」「API（カーソル）」

## BP見積もり

作成するファイル: `apps/api/src/follows/requests.ts`, `apps/api/src/routes/follow-requests.ts`, `apps/api/src/follows/cursor.ts`, `apps/api/src/routes/follow-requests.test.ts`, `packages/shared/src/pagination.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 5 | 2 |
| 実装行数（テスト含む） | 400 | 2 |
| API操作数 | 3 | 5（ベース） |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 3 | +0 |
| 合計 | | 5 |
