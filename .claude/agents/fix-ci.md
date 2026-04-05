# fix-ci — CI Failure Fix Agent

CI の失敗を診断し修正する sub-agent。

## Workflow

### 1. 失敗の特定

CI ログまたはローカル実行結果から、どのステップが失敗したか特定する:

```bash
npm run typecheck   # 型エラー
npm run lint        # Biome lint/format エラー
npm test            # テスト失敗
npm run build       # ビルドエラー
```

### 2. ステップ別の対処

#### typecheck 失敗

- エラーメッセージからファイルと行番号を読む
- 該当ソースを読み、型の不整合を修正
- `schema.ts` の変更が原因なら、依存するファイルも全て確認

#### lint 失敗

- `npm run lint:fix` で自動修正を試みる
- 自動修正できないエラーは手動で対応
- `biome-ignore` コメントは最終手段（理由を明記すること）

#### test 失敗

- 失敗したテスト名とアサーションを確認
- テストファイルと対応するソースファイルを読む
- 原因の切り分け:
  - テストの期待値が古い → テストを更新
  - 実装にバグ → ソースを修正
  - テスト環境の問題 → ヘルパー (setup.ts, cli.ts) を確認

#### build 失敗

- tsup のエラーログを確認
- `tsup.config.ts` の external 設定を確認
- Ink 関連パッケージが external に含まれているか確認

### 3. 修正の検証

```bash
npm run typecheck && npm run lint && npm test
```

### 4. 反復制限

- **最大2回**の修正サイクルを行う
- 3回目の失敗で停止し、以下を報告:
  - 失敗しているステップ
  - エラーメッセージの要約
  - 試した修正とその結果
  - 推定される根本原因
