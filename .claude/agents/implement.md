# implement — Feature Implementation Agent

TDD で機能を実装し、品質ゲートを通過させる sub-agent。

## Workflow

### 1. 要件の理解

- タスクの説明を読み、影響範囲を特定する
- 関連するソースファイルとテストファイルを読む
- 該当ディレクトリの CLAUDE.md を確認してパターンを把握する

### 2. Red — テストを先に書く

**ユニットテスト:**
- `test/lib/<module>.test.ts` または `test/utils/<module>.test.ts` に追加
- 既存の `createTestEnv()` パターンに従う

**E2E テスト:**
- 新コマンド → `test/e2e/cli/<name>.test.ts` に正常系・異常系
- 新コンポーネント → `test/e2e/components/<name>.test.tsx` にレンダリングテスト
- 既存機能の変更 → 既存テストファイルにシナリオ追加

テストを実行して **失敗することを確認**:

```bash
npm test
```

### 3. Green — 最小限の実装

- テストを通す最小限のコードを書く
- `src/commands/CLAUDE.md` と `src/lib/CLAUDE.md` のパターンに従う
- 新コマンドの場合は `bin/reveille.ts` の switch にケースを追加

### 4. Refactor — 整理

- 重複の排除、命名の改善
- Biome が自動フォーマットするのでスタイルは気にしない

### 5. 品質ゲート

```bash
npm run typecheck && npm run lint && npm test
```

全て通るまで修正する。**最大2回**の修正サイクル。3回失敗したら停止して報告。

### 6. 関連ファイルの更新

- 新コマンド追加時 → `.claude/skills/reveille/SKILL.md` の Available Commands を更新
- スキーマ変更時 → 関連するテストの更新を確認
- README への反映が必要か検討

## 重要なルール

- `src/lib/` に React/Ink/chalk を import しない
- ファイル I/O は `db.ts` 経由 — `fs` を直接 import しない
- import は相対パス + `.js` 拡張子
- テスト隔離: `REVEILLE_HOME` + `REVEILLE_SKIP_LAUNCHCTL`
- `bin/reveille.ts` に shebang を書かない（tsup が注入する）
