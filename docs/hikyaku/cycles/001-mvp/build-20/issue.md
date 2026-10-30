# Build 20: フォロー申請・フォロワー画面

## やること

- フォロー申請一覧画面を作る。申請者の名前つきで新しい順に表示し（無限スクロール）、承認・拒否の操作を出す
- フォロワー一覧画面を作る。自分のフォロワーを名前つきで新しい順に表示し（無限スクロール）、フォロワーを外す操作を出す
- ヘッダーまたは設定画面から、この2画面への導線を足す

## やらないこと

- 他ユーザーのフォロワー一覧・フォロー中一覧（スコープ外）
- 申請の通知（スコープ外）

## 対応する受け入れ基準

- US-13.1, US-13.2, US-13.3, US-14.1, US-14.2, US-14.3

## 受け入れ基準

- [ ] 申請一覧に申請者の名前が新しい順に出て、続きが自動で読み込まれる
- [ ] 承認すると申請が一覧から消え、申請者がフォロワー一覧に出る。拒否すると申請が消える
- [ ] フォロワー一覧からフォロワーを外せる
- [ ] ゲストと、一覧の対象が無いユーザーには適切な空状態・ログイン誘導が出る

## 参照する設計ドキュメント

- design-delta.md「API（一覧系）」

## BP見積もり

作成するファイル: `apps/web/app/follow-requests/page.tsx`, `apps/web/app/follow-requests/request-row.tsx`, `apps/web/app/followers/page.tsx`, `apps/web/app/followers/follower-row.tsx`, `apps/web/app/actions/follow-requests.ts`, `apps/web/app/actions/followers.ts`, `apps/web/components/nav.tsx`（変更）, `apps/web/app/follow-requests/request-row.test.tsx`, `apps/web/app/followers/follower-row.test.tsx`, `apps/web/components/user-list.tsx`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 10 | 3（ベース） |
| 実装行数（テスト含む） | 700 | 3 |
| API操作数 | 0 | 1 |
| 画面/ページ数 | 2 | 3 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 3 | +0 |
| 合計 | | 3 |
