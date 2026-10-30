# Build 14: 検索API

## やること

- 検索クエリのパーサーを `packages/shared` に実装する。空白（全角含む）区切り AND、大文字 `OR`（AND より強く結合）、`-` 除外、`"..."` フレーズ、`-"..."` フレーズ除外。小文字 `or`、閉じていない `"`、先頭・末尾の `OR`、記号だけの `-` は通常文字として扱う
- 空や除外だけなど条件が成り立たない入力を判定し、400で理由を返す
- NFKC 正規化 + 小文字化した検索語を `LIKE` 条件（ワイルドカードをエスケープ）に変換する
- `search_text` に pg_bigm の GIN 索引を張るマイグレーションを作る
- `GET /search?q=` を実装する。閲覧者が見られる投稿を新しい順に1回最大20件、`cursor` で続きを返す

## やらないこと

- ひらがな・カタカナの同一視、同義語（スコープ外）
- ユーザー名・投稿者・期間での絞り込み（スコープ外）
- 検索画面（build-21）

## 対応する受け入れ基準

- US-10.1, US-10.2, US-10.3, US-10.4, US-10.5, US-10.6, US-10.7, US-10.8, US-10.9, US-10.10, US-10.11, US-10.12, US-10.13, US-10.14, US-5.2

## 受け入れ基準

- [ ] 部分一致で検索でき、「ＡＢＣ」で「abc」、「ｶﾀｶﾅ」で「カタカナ」がヒットする
- [ ] AND / OR / 除外 / フレーズ / フレーズ除外が仕様どおりに動き、OR は AND より強く結合する
- [ ] 通常文字として扱う入力（小文字 `or`、閉じていない `"`、端の `OR`、記号だけの `-`）が仕様どおり
- [ ] 空・除外だけの入力は検索せず400で理由が返る
- [ ] 非公開ユーザーの投稿は、閲覧権の無い閲覧者に出ない。削除した投稿は出ない
- [ ] 各投稿に本文・画像・投稿日時・投稿者名・`like_count`・`is_liked_by_me` が含まれる

## 参照する設計ドキュメント

- design-delta.md「検索」
- ADR: `20261030-search-pg-bigm.md`

## BP見積もり

作成するファイル: `packages/shared/src/search/tokenizer.ts`, `packages/shared/src/search/parser.ts`, `packages/shared/src/search/ast.ts`, `packages/shared/src/search/parser.test.ts`, `apps/api/src/search/to-sql.ts`, `apps/api/src/search/normalize.ts`, `apps/api/src/routes/search.ts`, `apps/api/drizzle/0006_search_index.sql`, `apps/api/src/search/to-sql.test.ts`, `apps/api/src/routes/search.test.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 10 | 3（ベース） |
| 実装行数（テスト含む） | 900 | 3 |
| API操作数 | 1 | 2 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 3 | +0 |
| 合計 | | 3 |
