# Build 22: 単体ページのCDNキャッシュ対応

## やること

- ゲスト（Authorization・セッションクッキーなし）への公開投稿の `GET /posts/:id` と web の単体ページ HTML に `Cache-Control: public, s-maxage=10` を付け、ログイン中のリクエストと非公開ユーザーの投稿には `private, no-store` を付ける
- 投稿の削除と、作者が非公開に切り替えたときに、CloudFront の無効化を依頼する。削除は該当する2 URL、非公開化は `/posts/*` のワイルドカード1パスを無効化する
- 無効化依頼を DB の再試行キュー（テーブル + ワーカー）に積み、失敗時は再試行する。ローカルでは無効化を行わない設定（no-op）にできる

## やらないこと

- CloudFront 自体の構築（build-24）。このビルドの時点では Cache-Control と無効化依頼が入るだけで、キャッシュは効かない
- 一覧のキャッシュ（スコープ外）

## 対応する受け入れ基準

- なし（非機能要件: 単体ページへのアクセス集中への備え。ADR `20261030-post-page-cdn-cache.md` が根拠）

## 受け入れ基準

- [ ] ゲストへの公開投稿の応答（API と web の単体ページ）が `public, s-maxage=10` になる
- [ ] ログイン中のリクエスト、非公開ユーザーの投稿、404 の応答は `private, no-store` になる
- [ ] 投稿を削除すると、該当する2 URL の無効化依頼がキューに積まれる。作者が非公開に切り替えると `/posts/*` の依頼が積まれる
- [ ] 無効化の呼び出しに失敗した依頼が再試行される
- [ ] ゲスト向けの応答に個人別の情報（`is_liked_by_me` など）が含まれない

## 参照する設計ドキュメント

- design-delta.md「単体ページの集中対策」
- ADR: `20261030-post-page-cdn-cache.md`

## BP見積もり

作成するファイル: `apps/api/src/cache/headers.ts`, `apps/api/src/cache/invalidation.ts`, `apps/api/src/db/schema/invalidations.ts`, `apps/api/drizzle/0007_invalidations.sql`, `apps/api/src/cache/worker.ts`, `apps/api/src/cache/headers.test.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 6 | 3（ベース） |
| 実装行数（テスト含む） | 500 | 2 |
| API操作数 | 0 | 1 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 1 | 2 |
| 影響ファイル数 | 5 | +1 |
| 外部API連携（CloudFront） | あり | +1 |
| 合計 | | 5 |
