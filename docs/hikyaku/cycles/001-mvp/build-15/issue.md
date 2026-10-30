# Build 15: web基盤・登録/ログイン画面

## やること

- OpenAPI から生成した型付きクライアントを使う、web サーバー側の API 呼び出し層（BFF）を作る。web は DB に直接触らない
- セッショントークンを `HttpOnly; Secure; SameSite=Lax`・30日（利用ごとに延長）のクッキーで保持し、API へ Bearer として転送する。状態を変えるリクエストは Origin ヘッダを検証する（CSRF 対策）
- 共通レイアウト（日本語、PC とスマートフォン幅のレスポンシブ、ヘッダーのログイン状態表示）と、最低限の UI 部品（ボタン・入力・フィールド・エラー表示）を作る
- ユーザー登録画面、ログイン画面、ログアウト操作を作る。フィールド単位のエラーと、確認が必要である旨を表示する
- 日時は UTC で受け、日本時間で表示する共通の整形関数を用意する
- ALB のヘルスチェック用エンドポイントを用意する（build-23 は web のヘルスチェックを `/` に設定している。`/` が 3xx や認証リダイレクトを返すと unhealthy になりデプロイがロールバックされ続けるので、200 を返す専用パス（例: `/healthz`）を作り、build-24 で ALB の設定をそのパスに合わせる）

## やらないこと

- メール確認・パスワードリセット画面（build-16）
- トップページやフィード（build-17）。このビルドの時点ではルートの初期画面を最小の案内に置き換える

## 対応する受け入れ基準

- US-1.1, US-1.3, US-1.6, US-2.1, US-2.2, US-2.3

## 受け入れ基準

- [ ] 登録フォームから登録でき、未入力・形式不正の理由がフィールドごとに表示される
- [ ] ログインでき、誤りではエラーが、未確認では確認が必要である旨が表示される
- [ ] ログアウトすると以降はゲストとして扱われる
- [ ] クッキーの属性が仕様どおりで、Origin が不正な状態変更リクエストは拒否される
- [ ] PC とスマートフォンの幅の両方で崩れない
- [ ] ヘルスチェック用のパスが、ログインの有無にかかわらず 200 を返す

## 参照する設計ドキュメント

- design-delta.md「全体構成」「認証・メール」「画面と国際化」
- ADR: `20261030-api-rest-openapi.md`, `20261030-session-auth.md`
- `apps/web/AGENTS.md`（Next.js 16 固有の注意）

## BP見積もり

作成するファイル: `apps/web/lib/api-client.ts`, `apps/web/lib/session.ts`, `apps/web/lib/csrf.ts`, `apps/web/lib/format-date.ts`, `apps/web/app/layout.tsx`（変更）, `apps/web/app/register/page.tsx`, `apps/web/app/register/register-form.tsx`, `apps/web/app/login/page.tsx`, `apps/web/app/login/login-form.tsx`, `apps/web/app/logout/actions.ts`, `apps/web/components/ui/button.tsx`, `apps/web/components/ui/field.tsx`, `apps/web/proxy.ts`, `apps/web/lib/csrf.test.ts`, `apps/web/lib/format-date.test.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 15 | 3（ベース） |
| 実装行数（テスト含む） | 1000 | 3 |
| API操作数 | 0 | 1 |
| 画面/ページ数 | 2 | 3 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 4 | +1 |
| 基盤セットアップ | あり | +1 |
| 合計 | | 5 |
