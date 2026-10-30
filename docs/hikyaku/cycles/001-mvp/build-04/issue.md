# Build 04: メール確認API

## やること

- `email_tokens` テーブル（確認・リセット共用。ハッシュ保存・有効期限・使用済み）とマイグレーションを作る
- メール送信モジュールを作る（nodemailer の SMTP。ローカルは Mailpit、本番は SES を環境変数で切り替える）
- 登録時に確認メールを送る。確認用エンドポイントで確認を完了させ、確認メールの再送エンドポイントを作る
- 重複登録時は、登録済みアドレスに「登録済み」を知らせるメールを送る（応答は新規登録と同じ）
- 登録・再送のレート制限を適用する（build-03 の基盤を使う）

## やらないこと

- パスワードリセット（build-05）
- 確認用リンクが開く画面（build-16）
- 本番の SES 設定（build-24）

## 対応する受け入れ基準

- US-1.4, US-1.5, US-1.6, US-1.8

## 受け入れ基準

- [ ] 登録すると確認メールが Mailpit に届き、リンクのトークンで確認が完了する
- [ ] 確認前は、正しい資格情報でもログインできず確認が必要である旨が返る。確認後はログインできる
- [ ] 確認していないユーザーだけが再送でき、確認済みのユーザーの再送は拒否される。再送の応答はアカウントの有無を漏らさない
- [ ] 期限切れ・使用済みのトークンは拒否される
- [ ] 重複登録時は登録済みアドレスに通知メールが届く

## 参照する設計ドキュメント

- design-delta.md「認証・メール」
- ADR: `20261030-session-auth.md`

## BP見積もり

作成するファイル: `apps/api/src/db/schema/email-tokens.ts`, `apps/api/drizzle/0002_email_tokens.sql`, `apps/api/src/mail/mailer.ts`, `apps/api/src/mail/templates.ts`, `apps/api/src/auth/email-token.ts`, `apps/api/src/routes/email-verifications.ts`, `apps/api/src/routes/email-verifications.test.ts`, `apps/api/src/mail/mailer.test.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 8 | 3（ベース） |
| 実装行数（テスト含む） | 500 | 2 |
| API操作数 | 2 | 3 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 1 | 2 |
| 影響ファイル数 | 4 | +1 |
| 外部API連携（SMTP/SES） | あり | +1 |
| 合計 | | 5 |
