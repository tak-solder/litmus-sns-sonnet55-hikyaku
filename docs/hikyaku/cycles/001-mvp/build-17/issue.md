# Build 17: フィード・タイムライン画面

## やること

- トップページ（`/`）を作る。ゲストにはグローバルフィードと、ユーザー登録・ログインへの導線を、ログインユーザーにはタイムラインを表示する。ログインユーザーはタブでグローバルフィードと切り替えられる
- 投稿カード（本文・画像・投稿日時（日本時間）・投稿者名・合計いいね数・いいね済みか）と、一覧コンポーネント（下までスクロールすると続きを読み込む無限スクロール）を作る
- 一覧上のいいね／いいね取り消しの操作を作る（ゲストは操作できず、ログインを促す）

## やらないこと

- 投稿者名のリンク先（ユーザーページ、build-19）。このビルドでは投稿者名をリンクにしない
- 単体ページへの遷移とシェア（build-18）。このビルドでは遷移・シェアの導線を出さない
- 投稿フォーム（build-18）、検索（build-21）

## 対応する受け入れ基準

- US-15.1, US-15.2, US-15.3, US-8.1, US-8.2, US-8.3, US-8.4, US-9.1, US-9.3, US-9.4, US-9.6, US-7.1, US-7.2, US-4.3, US-4.7

## 受け入れ基準

- [ ] ゲストのトップページでグローバルフィードと登録・ログインへの導線が表示される
- [ ] ログインユーザーのトップページでタイムラインが表示され、グローバルフィードにタブで切り替えて戻れる
- [ ] 下までスクロールすると続きの20件が自動で読み込まれ、これ以上無いと分かる
- [ ] 各投稿に本文・画像・日本時間の投稿日時・投稿者名・いいね数・いいね済みが表示される
- [ ] いいねと取り消しで、いいね数と状態が更新される。ゲストにはログインを促す表示が出る
- [ ] PC とスマートフォンの幅の両方で崩れない

## 参照する設計ドキュメント

- design-delta.md「API（一覧系）」「画面と国際化」

## BP見積もり

作成するファイル: `apps/web/app/page.tsx`（変更）, `apps/web/components/post-card.tsx`, `apps/web/components/post-list.tsx`, `apps/web/components/infinite-scroll.tsx`, `apps/web/components/like-button.tsx`, `apps/web/components/feed-tabs.tsx`, `apps/web/app/actions/likes.ts`, `apps/web/app/actions/feed.ts`, `apps/web/components/post-card.test.tsx`, `apps/web/components/post-list.test.tsx`, `apps/web/components/like-button.test.tsx`, `apps/web/app/page.module.css`（変更）, `apps/web/components/post-card.module.css`, `apps/web/components/guest-cta.tsx`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 14 | 3（ベース） |
| 実装行数（テスト含む） | 900 | 3 |
| API操作数 | 0 | 1 |
| 画面/ページ数 | 1 | 2 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 4 | +1 |
| 合計 | | 4 |
