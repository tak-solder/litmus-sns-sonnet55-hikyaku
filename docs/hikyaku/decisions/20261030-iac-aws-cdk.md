---
status: accepted
---

# インフラのコードは AWS CDK（TypeScript）で書く

- **決定**: 本番構成の AWS リソースを `infra/` に AWS CDK（TypeScript）で定義する
- **文脈**: 本番構成に必要な AWS リソースをすべてコードで構築できることが成果物の要件。リポジトリは TypeScript で統一されている
- **検討した案**:
  - 案A: AWS CDK（TypeScript）
  - 案B: Terraform
- **採用理由**: 言語が統一され、型補完とレビューがしやすい。チームが新しい言語を学ばずに済む
- **トレードオフ**: CDK は CloudFormation に依存し、スタックの更新失敗時のロールバックや差分確認が Terraform より扱いづらい場面がある。AWS 以外への移植性も低い。Terraform は HCL の追加が必要でチームの学習コストが増えるため退けた
- **影響範囲**: `infra/`（新規）、デプロイ手順
