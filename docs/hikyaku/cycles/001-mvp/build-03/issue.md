# Build 03: 認証API（登録・ログイン・ログアウト）

## やること

- `users` と `sessions` と `rate_limits`（レート制限のカウンタ）のテーブルとマイグレーションを作る
- `POST /users`（名前・メールアドレス・パスワードで登録。公開範囲は `public`）、`POST /sessions`（ログイン）、`DELETE /sessions`（ログアウト）、`GET /me` を実装する
- パスワードは argon2id、セッショントークンはランダム値のハッシュを保存する。認証ミドルウェア（Bearer。トークンが無ければゲスト）を作る
- メールアドレス確認済みかを判定する仕組みを用意し、未確認ユーザーはパスワードが正しい場合にだけ「確認が必要」を返してログインを拒否する
- レート制限の基盤（PostgreSQL のカウンタとミドルウェア）を作り、登録とログインに適用する
- 入力検証（未入力・メール形式）の理由をフィールド単位で返す

## やらないこと

- 確認メールの送信・確認・再送（build-04）。このビルドの時点では確認済みのユーザーを作る手段が無く、ログインの成功はテストでのみ確認する
- 重複登録の通知メール（build-04）。重複時は新しいアカウントを作らず、新規登録と同じ応答にする
- パスワードリセット（build-05）、公開範囲の変更（build-06）、web の画面（build-15）

## 対応する受け入れ基準

- US-1.1, US-1.2, US-1.3, US-1.7, US-2.1, US-2.2, US-2.3

## 受け入れ基準

- [ ] 名前・メールアドレス・パスワードで登録でき、登録直後の公開範囲は `public`
- [ ] 登録済みのメールアドレスでは新しいアカウントが作られず、応答は新規登録と区別できない
- [ ] 未入力・形式不正は 400 で、理由がフィールド単位で返る
- [ ] 確認済みのユーザーが正しい資格情報でログインでき、誤りでは 401 になる
- [ ] 未確認のユーザーは、パスワードが正しい場合にだけ「確認が必要」で拒否される
- [ ] ログアウト後のトークンはゲスト扱いになる
- [ ] 登録とログインがレート制限される

## 参照する設計ドキュメント

- design-delta.md「データモデル」「認証・メール」
- ADR: `20261030-session-auth.md`

## BP見積もり

作成するファイル: `apps/api/src/db/schema/users.ts`, `apps/api/src/db/schema/sessions.ts`, `apps/api/src/db/schema/rate-limits.ts`, `apps/api/drizzle/0001_auth.sql`, `apps/api/src/auth/password.ts`, `apps/api/src/auth/session.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/middleware/rate-limit.ts`, `apps/api/src/routes/users.ts`, `apps/api/src/routes/sessions.ts`, `apps/api/src/routes/auth.test.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 10 | 3 |
| 実装行数（テスト含む） | 700 | 3 |
| API操作数 | 4 | 5（ベース） |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 2 | 3 |
| 影響ファイル数 | 3 | +0 |
| 合計 | | 5 |
