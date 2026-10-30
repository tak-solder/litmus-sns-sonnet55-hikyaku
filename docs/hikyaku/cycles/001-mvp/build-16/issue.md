# Build 16: メール確認・パスワードリセット画面

## やること

- メール確認の結果画面（確認メールのリンク先。完了・期限切れ・使用済みを表示）と、確認メールの再送画面を作る
- パスワードリセットの要求画面（メールアドレス入力。結果は登録の有無によらず同じ表示）と、新しいパスワードの設定画面（リセットメールのリンク先）を作る
- ログイン画面から、再送画面とリセット要求画面への導線を足す

## やらないこと

- メール送信・トークン処理（build-04, 05 で実装済み）
- プロフィール編集としてのパスワード変更（スコープ外）

## 対応する受け入れ基準

- US-1.5, US-1.8, US-3.1, US-3.2

## 受け入れ基準

- [ ] 確認メールのリンクを開くと確認が完了し、ログインできるようになる。無効なリンクでは理由が表示される
- [ ] 未確認のユーザーが確認メールを再送できる
- [ ] リセット要求の結果表示が、登録の有無によらず同じ
- [ ] リセットのリンクから新しいパスワードを設定でき、設定後に新しいパスワードでログインできる

## 参照する設計ドキュメント

- design-delta.md「認証・メール」

## BP見積もり

作成するファイル: `apps/web/app/verify-email/page.tsx`, `apps/web/app/verify-email/resend/page.tsx`, `apps/web/app/verify-email/resend/resend-form.tsx`, `apps/web/app/forgot-password/page.tsx`, `apps/web/app/forgot-password/forgot-form.tsx`, `apps/web/app/reset-password/page.tsx`, `apps/web/app/reset-password/reset-form.tsx`, `apps/web/app/login/login-form.tsx`（変更）, `apps/web/app/verify-email/page.test.tsx`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 9 | 3 |
| 実装行数（テスト含む） | 600 | 3 |
| API操作数 | 0 | 1 |
| 画面/ページ数 | 3 | 5（ベース） |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 3 | +0 |
| 合計 | | 5 |
