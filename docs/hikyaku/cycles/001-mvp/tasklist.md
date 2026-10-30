# ビルド一覧 — 001-mvp

ビルドの完了判定は `PR` 列が非空かどうかで行います。
`PR` 列の更新は当該ビルドの PR に同梱されるため、デフォルトブランチ上で
`PR` 列が埋まっていること自体がマージ済みを意味します。

依存関係のあるビルドは、先行ビルドがデフォルトブランチにマージ済みであることが必須です。
依存関係がないビルドは並行実行できます。

| buildID | title                                         | BP | dependencies       | issue                        | PR                                                                     |
| ------- | --------------------------------------------- | --- | ------------------ | ---------------------------- | ---------------------------------------------------------------------- |
| 1       | ローカル環境とDB基盤                          | 4  | —                  | [issue](./build-01/issue.md) | [#5](https://github.com/tak-solder/litmus-sns-sonnet55-hikyaku/pull/5) |
| 2       | API骨格・共有パッケージ・CI                   | 5  | 1                  | [issue](./build-02/issue.md) | —                                                                      |
| 3       | 認証API（登録・ログイン・ログアウト）         | 5  | 2                  | [issue](./build-03/issue.md) | —                                                                      |
| 4       | メール確認API                                 | 5  | 3                  | [issue](./build-04/issue.md) | —                                                                      |
| 5       | パスワードリセットAPI                         | 4  | 4                  | [issue](./build-05/issue.md) | —                                                                      |
| 6       | フォローと公開範囲API                         | 5  | 3                  | [issue](./build-06/issue.md) | —                                                                      |
| 7       | フォロー申請の承認・拒否API                   | 5  | 6                  | [issue](./build-07/issue.md) | —                                                                      |
| 8       | フォロワー一覧・外すAPI                       | 3  | 6                  | [issue](./build-08/issue.md) | —                                                                      |
| 9       | 投稿API（作成・削除・単体取得）と可視性述語   | 5  | 6                  | [issue](./build-09/issue.md) | —                                                                      |
| 10      | 画像添付                                      | 4  | 9                  | [issue](./build-10/issue.md) | —                                                                      |
| 11      | いいねAPI                                     | 3  | 9                  | [issue](./build-11/issue.md) | —                                                                      |
| 12      | グローバルフィード・ユーザーページ投稿一覧API | 4  | 10, 11             | [issue](./build-12/issue.md) | —                                                                      |
| 13      | タイムラインAPI                               | 2  | 12                 | [issue](./build-13/issue.md) | —                                                                      |
| 14      | 検索API                                       | 3  | 12                 | [issue](./build-14/issue.md) | —                                                                      |
| 15      | web基盤・登録/ログイン画面                    | 5  | 3, 4               | [issue](./build-15/issue.md) | —                                                                      |
| 16      | メール確認・パスワードリセット画面            | 5  | 15, 5              | [issue](./build-16/issue.md) | —                                                                      |
| 17      | フィード・タイムライン画面                    | 4  | 15, 13             | [issue](./build-17/issue.md) | —                                                                      |
| 18      | 投稿作成・削除・単体ページ・シェア画面        | 5  | 17, 10             | [issue](./build-18/issue.md) | —                                                                      |
| 19      | ユーザーページ・フォロー・公開範囲画面        | 4  | 17                 | [issue](./build-19/issue.md) | —                                                                      |
| 20      | フォロー申請・フォロワー画面                  | 3  | 19, 7, 8           | [issue](./build-20/issue.md) | —                                                                      |
| 21      | 検索画面                                      | 3  | 17, 14             | [issue](./build-21/issue.md) | —                                                                      |
| 22      | 単体ページのCDNキャッシュ対応                 | 5  | 18                 | [issue](./build-22/issue.md) | —                                                                      |
| 23      | インフラ: ネットワーク・DB・ECS               | 5  | 2                  | [issue](./build-23/issue.md) | —                                                                      |
| 24      | インフラ: S3・CloudFront・SES・デプロイCI     | 5  | 23, 22             | [issue](./build-24/issue.md) | —                                                                      |
| 25      | README・性能テスト                            | 4  | 14, 22, 24, 21, 20 | [issue](./build-25/issue.md) | —                                                                      |

## 依存グラフ

```mermaid
graph TD
  b01["build-01: ローカル環境とDB基盤"]
  b02["build-02: API骨格・共有パッケージ・CI"]
  b03["build-03: 認証API（登録・ログイン・ログアウト）"]
  b04["build-04: メール確認API"]
  b05["build-05: パスワードリセットAPI"]
  b06["build-06: フォローと公開範囲API"]
  b07["build-07: フォロー申請の承認・拒否API"]
  b08["build-08: フォロワー一覧・外すAPI"]
  b09["build-09: 投稿API（作成・削除・単体取得）と可視性述語"]
  b10["build-10: 画像添付"]
  b11["build-11: いいねAPI"]
  b12["build-12: グローバルフィード・ユーザーページ投稿一覧API"]
  b13["build-13: タイムラインAPI"]
  b14["build-14: 検索API"]
  b15["build-15: web基盤・登録/ログイン画面"]
  b16["build-16: メール確認・パスワードリセット画面"]
  b17["build-17: フィード・タイムライン画面"]
  b18["build-18: 投稿作成・削除・単体ページ・シェア画面"]
  b19["build-19: ユーザーページ・フォロー・公開範囲画面"]
  b20["build-20: フォロー申請・フォロワー画面"]
  b21["build-21: 検索画面"]
  b22["build-22: 単体ページのCDNキャッシュ対応"]
  b23["build-23: インフラ: ネットワーク・DB・ECS"]
  b24["build-24: インフラ: S3・CloudFront・SES・デプロイCI"]
  b25["build-25: README・性能テスト"]
  b01 --> b02
  b02 -.-> b03
  b03 -.-> b04
  b04 -.-> b05
  b03 -.-> b06
  b06 -.-> b07
  b06 -.-> b08
  b06 -.-> b09
  b09 -.-> b10
  b09 -.-> b11
  b10 -.-> b12
  b11 -.-> b12
  b12 -.-> b13
  b12 -.-> b14
  b04 -.-> b15
  b15 -.-> b16
  b05 -.-> b16
  b15 -.-> b17
  b13 -.-> b17
  b17 -.-> b18
  b17 -.-> b19
  b19 -.-> b20
  b07 -.-> b20
  b08 -.-> b20
  b17 -.-> b21
  b14 -.-> b21
  b18 -.-> b22
  b02 -.-> b23
  b23 -.-> b24
  b22 -.-> b24
  b24 -.-> b25
  b21 -.-> b25
  b20 -.-> b25
  classDef merged fill:#fbefff,stroke:#8250df,color:#6639ba
  classDef ready fill:#dafbe1,stroke:#1a7f37,color:#116329
  classDef blocked fill:#f6f8fa,stroke:#8c959f,color:#57606a
  class b01 merged
  class b02 ready
  class b03,b04,b05,b06,b07,b08,b09,b10,b11,b12,b13,b14,b15,b16,b17,b18,b19,b20,b21,b22,b23,b24,b25 blocked
  linkStyle 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32 stroke:#8c959f,stroke-dasharray:5 5
```

紫: 完了（merged） / 緑: 着手可能（ready） / グレー: 待機中（blocked）。点線は先行ビルドが未完了の依存
