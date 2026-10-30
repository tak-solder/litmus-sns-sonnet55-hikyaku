# Build 10: 画像添付

## やること

- `POST /uploads`（署名付き PUT URL の発行。Content-Type と最大サイズを条件に含み、`pending/{user_id}/{UUID}` に置く）を実装する
- `POST /posts` で `image_key` を受け、本人の `pending/{user_id}/` 配下であること、形式（JPEG / PNG / GIF / WebP のマジックバイト）、サイズ（5MB 以内）を検証して、通ったものだけを `images/{UUID}` へコピーして確定する
- 投稿の削除時に、確定した画像も削除する
- 投稿オブジェクトの画像 URL を CloudFront 経由（ローカルは MinIO）の URL にする。本文なし・画像のみの投稿を許す
- ローカルの MinIO を使った S3 クライアントの設定を用意する

## やらないこと

- 本番の S3・CloudFront の構築（build-24）
- 画像のアップロード画面（build-18）
- 2枚以上の画像・動画（スコープ外）

## 対応する受け入れ基準

- US-4.5, US-4.6, US-4.7

## 受け入れ基準

- [ ] 画像を1枚添えて投稿でき、本文は空でもよい。画像付き投稿の取得で画像 URL が返る
- [ ] 2枚以上、JPEG / PNG / GIF / WebP 以外、5MB 超は添付できず、理由が返る
- [ ] 他人の `pending/` の key、存在しない key、検証に通らないオブジェクトでは投稿が作られない
- [ ] 投稿を削除すると画像も削除される
- [ ] `pending/` のオブジェクトは配信 URL から取得できない

## 参照する設計ドキュメント

- design-delta.md「API（画像）」

## BP見積もり

作成するファイル: `apps/api/src/storage/s3.ts`, `apps/api/src/storage/image-validate.ts`, `apps/api/src/routes/uploads.ts`, `apps/api/src/posts/image.ts`, `apps/api/src/storage/image-validate.test.ts`, `apps/api/src/routes/uploads.test.ts`

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 6 | 3（ベース） |
| 実装行数（テスト含む） | 400 | 2 |
| API操作数 | 1 | 2 |
| 画面/ページ数 | 0 | 1 |
| DBテーブル/エンティティ数 | 0 | 1 |
| 影響ファイル数 | 3 | +0 |
| 外部API連携（S3） | あり | +1 |
| 合計 | | 4 |
