# Build 05: パスワードリセットAPI

## やること

- リセット要求（`POST /password-resets`）とリセット実行（`POST /password-resets/confirm`）を実装する。トークンは build-04 の `email_tokens`（`reset`）を使う
- 要求は登録の有無にかかわらず同じ応答にし、登録済みの場合だけメールを送る
- リセット実行でパスワードを更新し、そのユーザーの既存セッションをすべて失効させる
- 要求・実行にレート制限を適用する

## やらないこと

- リセット用の画面（build-16）
- プロフィール編集としてのパスワード変更（スコープ外）

## 対応する受け入れ基準

- US-3.1, US-3.2

## 受け入れ基準

- [ ] 登録済みアドレスで要求するとリセットメールが届き、未登録でも応答は変わらない
- [ ] リンクのトークンで新しいパスワードを設定でき、新しいパスワードでログインできて古いパスワードではできない
- [ ] リセット後、既存セッションはすべて無効になる
- [ ] 期限切れ・使用済みのトークンは拒否される

## 参照する設計ドキュメント

- design-delta.md「認証・メール」
- ADR: `20261030-session-auth.md`

## BP見積もり

作成するファイル: `apps/api/src/routes/password-resets.ts`, `apps/api/src/auth/password-reset.ts`, `apps/api/src/routes/password-resets.test.ts`, `apps/api/src/mail/templates.ts`（変更）, `apps/api/src/auth/session.ts`（変更）, `packages/shared/src/auth.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 6 | 3（ベース） |
| 実装行数（テスト含む） | 350 | 2 |
| API操作数 | 2 | 3 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 4 | +1 |
| 合計 | | 4 |
