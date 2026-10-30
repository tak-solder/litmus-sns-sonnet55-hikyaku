# Build 18: 投稿作成・削除・単体ページ・シェア画面

## やること

- 投稿フォーム（本文300文字カウンタ、画像を1枚選択、プレビュー）を作る。画像は API で署名付き URL を取得して直接アップロードする。形式・サイズ・枚数の違反と空投稿は理由を表示する。ゲストにはフォームを出さない
- 投稿の単体ページ（`/posts/:id`）を作る。本文・画像・投稿日時・投稿者名・いいね数・いいね済みを表示し、いいね／取り消し、投稿者のユーザーページへの導線（build-19 のページ）、自分の投稿なら削除ができる。見えない投稿は404表示
- 単体ページの `is_liked_by_me` などの個人別の状態は別リクエストで取得し、ゲスト向けの本体部分は共有キャッシュに載せられる構成にする
- シェア（URL をコピー、または端末の共有機能で渡す）を作り、build-17 の一覧の投稿カードに単体ページへの遷移とシェアの導線を足す

## やらないこと

- Cache-Control と CloudFront 無効化（build-22）
- ユーザーページ本体（build-19）。投稿者名のリンクは build-19 で全画面に足す

## 対応する受け入れ基準

- US-4.1, US-4.2, US-4.4, US-4.5, US-4.6, US-5.1, US-5.2, US-7.1, US-7.2, US-12.1, US-12.2, US-12.3, US-12.4, US-12.5

## 受け入れ基準

- [ ] 300文字以内のテキストだけ、画像だけ、両方で投稿でき、投稿が一覧の先頭に出る。違反は理由が表示される
- [ ] ゲストには投稿フォームが出ない
- [ ] 各一覧の投稿から単体ページへ移動できる。単体ページの URL を直接開いても表示される
- [ ] 単体ページでいいね／取り消し、削除（自分の投稿のみ）ができ、削除後は一覧・単体ページに出ない
- [ ] シェアで単体ページの URL をコピー、または端末の共有機能に渡せる
- [ ] 見えない投稿・存在しない投稿は同じ404表示になる

## 参照する設計ドキュメント

- design-delta.md「API（画像）」「単体ページの集中対策」
- ADR: `20261030-post-page-cdn-cache.md`

## BP見積もり

作成するファイル: `apps/web/components/post-form.tsx`, `apps/web/components/image-picker.tsx`, `apps/web/lib/upload.ts`, `apps/web/app/actions/posts.ts`, `apps/web/app/posts/[id]/page.tsx`, `apps/web/app/posts/[id]/post-actions.tsx`, `apps/web/app/posts/[id]/not-found.tsx`, `apps/web/components/share-button.tsx`, `apps/web/components/delete-button.tsx`, `apps/web/components/post-card.tsx`（変更）, `apps/web/components/post-form.test.tsx`, `apps/web/lib/upload.test.ts`, `apps/web/components/share-button.test.tsx`, `apps/web/app/posts/[id]/page.test.tsx`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 14 | 3（ベース） |
| 実装行数（テスト含む） | 1000 | 3 |
| API操作数 | 0 | 1 |
| 画面/ページ数 | 2 | 3 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 4 | +1 |
| 外部API連携（S3 直接アップロード） | あり | +1 |
| 合計 | | 5 |
