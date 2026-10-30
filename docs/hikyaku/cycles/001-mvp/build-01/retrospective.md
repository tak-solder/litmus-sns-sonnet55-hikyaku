# Build 01: ローカル環境とDB基盤 振り返り

## BP見積もりの振り返り

| 段階 | BP | 根拠 |
|------|----|------|
| architectフェーズ段階 | 4BP | issue.md のスコープ記述 |
| builderフェーズ段階 | 5BP | plan.md の内訳（下表） |
| **実績** | **7BP** | 実測（新規ファイル数・追加行数）+ 申告（下表） |

**セッション**: 1セッションで完結

**乖離**: +2BP（実績 7 − builderフェーズ段階 5）

**乖離の要因**: 入力値の読み違えではなく、実測値の性質による。`bp actual` の追加行数 1832 のうち 1404 行は `pnpm-lock.yaml` の自動生成差分で、これを除くと約 430 行（見積もりは約 300 行）。ロックファイルを含んだまま基準表に当てはめたため、実装行数の段階が 2BP → 5BP に上がった（ベース 3 → 5）。新規ファイル数（見積もり 13、実測 15）は、`config.test.ts` と `Dockerfile.minio` が増えた分。基準表の問題として扱う: 実際は1セッションに収まり、分割推奨にはならなかった。

### builderフェーズ段階の内訳

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 13 | 3（ベース） |
| 実装行数（テスト含む） | 300 | 2 |
| ベースBP（指標の最大値） | — | 3 |
| 影響ファイル数 | 5 | +1 |
| 基盤セットアップを含む | あり | +1 |
| **合計** | — | **5BP** |

### 実績の内訳

新規ファイル数 15・実装行数 1832 は `bp actual` の実測値（`pnpm-lock.yaml` の 1404 行を含む）。影響ファイル数 6 と基盤セットアップは申告。

| 項目 | 値 | BP |
|------|----|----|
| 新規ファイル数 | 15 | 3 |
| 実装行数（テスト含む） | 1832 | 5（ベース） |
| API操作数 | 未指定 | — |
| 画面/ページ数 | 未指定 | — |
| DBテーブル/エンティティ数 | 未指定 | — |
| ベースBP（指標の最大値） | — | 5 |
| 影響ファイル数 | 6 | +1 |
| 基盤セットアップを含む | あり | +1 |
| 外部API連携を含む | 未指定 | +0 |
| 既存コードの大規模リファクタ | 未指定 | +0 |
| **合計** | — | **7BP** |

## セッション中にスキル外で受けた指示

- G8 の回答（監督による委任された判断）で「`pnpm` と `docker compose` は子に許可済みなので、compose 起動を含む手動確認も実施すること」と指示を受けた。承認の根拠と一緒に `questions.md` へ記録済み。

## 改善提案

### R-1: bp actual の追加行数から自動生成ファイルを除く
- **状況**: Step 3 の BP実績の収集で、`bp actual` の追加行数にロックファイル（`pnpm-lock.yaml`、1404 行）が含まれ、実績が 5BP から 7BP に膨らんだ
- **指示内容**: なし（実績の集計で気づいた）
- **提案**: `bp actual` の除外対象に、ロックファイルなどの自動生成物を足せるようにする。または、集計結果に「自動生成物の行数」を別枠で示す
- **優先度**: Should
- **対象**: workflow
- **具体案**: `instructions.md` に次を追記する。「BP実績の収集では、`bp actual` の追加行数からロックファイル（`pnpm-lock.yaml` 等）の行数を差し引いた値を `--lines` に渡す。差し引いた行数は retrospective.md の乖離の要因に書く」

## リポジトリ固有の学び（L-N）

### L-1: `postgres:17` の named volume を `/var/lib/postgresql/data` に直接マウントすると initdb が失敗する
- **再現条件**: compose で `postgres:17` を `db-data:/var/lib/postgresql/data` にマウントし、`PGDATA` を指定せずに `docker compose up`。`initdb: error: directory "/var/lib/postgresql/data" exists but is not empty` で db が終了する
- **影響**: db が healthy にならず、api など `depends_on` の全サービスが起動しない
- **回避策**: `PGDATA=/var/lib/postgresql/data/pgdata` にする
- **判明したビルド**: build-01
- **判明日**: 2026-10-30

### L-2: pg_bigm のソースビルドに `libicu-dev` が要る
- **再現条件**: `postgres:17` に `build-essential` と `postgresql-server-dev-17` だけを入れて pg_bigm をビルドすると、`bigm_op.c` のコンパイルで `unicode/ucol.h: No such file or directory`
- **影響**: db イメージのビルドが失敗する
- **回避策**: `libicu-dev` を入れてビルドし、ビルド後に purge する（実行時ライブラリは postgres イメージに入っている）
- **判明したビルド**: build-01
- **判明日**: 2026-10-30

### L-3: Drizzle の SQL マイグレーションは journal に載らないと適用されない
- **再現条件**: `apps/api/drizzle/0000_*.sql` を手書きで置いただけで `runMigrations` を呼ぶ
- **影響**: エラーにならず何も適用されず、拡張や後続のテーブルが作られない
- **回避策**: `pnpm --filter api db:generate -- --custom --name <name>` 相当（`drizzle-kit generate --custom`）で生成し、`drizzle/meta/_journal.json` を一緒にコミットする
- **判明したビルド**: build-01
- **判明日**: 2026-10-30

### L-4: MinIO の公式イメージ・バイナリが取得できない
- **再現条件**: `minio/minio`（Docker Hub）は `pull access denied`、`quay.io/minio/minio` は 401、`dl.min.io/server/minio/release/linux-arm64/archive/minio.RELEASE.2025-04-22T22-12-26Z` は HTTP 410（2026-10-30 時点）
- **影響**: compose の minio が `image:` 指定では起動できない
- **回避策**: `docker/Dockerfile.minio` で `go install github.com/minio/minio@RELEASE.2025-04-22T22-12-26Z` を使いソースからビルドする（初回 約 1 分）
- **判明したビルド**: build-01
- **判明日**: 2026-10-30

### L-5: 他の compose プロジェクトと mailpit のホストポート 8025 が衝突する
- **再現条件**: 同じホストで別プロジェクト（例: coordible）が `8025:8025` を公開している状態で `docker compose up`。`Bind for 0.0.0.0:8025 failed: port is already allocated`
- **影響**: mailpit が起動せず、`up --wait` が失敗する。エラー時に残った mailpit は公開ポート無しで `running` のままになり、`up` を再実行しても作り直されない
- **回避策**: `MAILPIT_UI_PORT`（既定 8025）を `.env` か `--env-file` で変え、`docker compose up --force-recreate` で作り直す
- **判明したビルド**: build-01
- **判明日**: 2026-10-30
