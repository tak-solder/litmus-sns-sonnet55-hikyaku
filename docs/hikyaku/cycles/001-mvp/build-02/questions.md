# Build 02: 共有パッケージ・Biome・CI 質問

## Q1: plan.md の BP 再算出が 7BP（bpMax − 2 以上）になった。build-02 を分割するか（G6）
**回答**: 案1を選ぶ。build-02「共有パッケージ・Biome・CI」と、新規 build-26「APIエラー形式・OpenAPI・クライアント生成」に分割する。
（委任された判断: 監督が下した。根拠: 7BP は分割の目安を超える。分割線は design-delta の「API（REST + OpenAPI）」と「CI/CD と開発体制」の境界に沿っており、基盤整備のみで本番データへの影響は無い。）
## Q2: 分割後の plan.md と test-spec.md を承認するか（G8）

**回答**: 承認。Step 4（実装）に進む。
（委任された判断: 監督が下した。根拠: 受け入れ基準2件が test-spec の手動確認・自動テストで網羅されている。validate は問題なし。データ安全も問題なし。CI 相当のローカル検証を実施する。）

---

Q1 の条件: build-26 は build-02 に依存、build-03 は build-02, build-26 に依存。CI の OpenAPI 差分確認は build-26 側に移す。build-15 など web からクライアントを使うビルドは build-03 経由で build-26 を推移的に含むため、依存の変更は不要。
