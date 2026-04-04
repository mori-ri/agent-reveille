# Developer Notes

## ローカル開発

```bash
# 開発モードで実行
npx tsx bin/reveille.ts --help
npx tsx bin/reveille.ts add
npx tsx bin/reveille.ts list
npx tsx bin/reveille.ts dashboard

# グローバルにリンクして `reveille` コマンドとして使う
npm run build && npm link
reveille --help

# リンク解除
npm unlink -g reveille
```

## アーキテクチャ決定の経緯

### launchd経由の間接実行

launchdのplistはAIエージェントCLIを直接呼び出さず、`reveille run <id>` を経由する。
これにより以下を自動化：
- 実行開始/終了の記録
- stdout/stderr のログファイル保存
- タイムアウト処理（デフォルト30分）
- 終了コード・ステータスの追跡

### ストレージ: JSON vs SQLite

MVPではJSONファイルを採用。理由：
- `better-sqlite3` がNode.js v25でネイティブビルドに失敗した
- タスク数・実行履歴の規模的にJSONで十分
- 将来的にSQLiteへの移行は容易（スキーマは `src/lib/schema.ts` で定義済み）

ファイル配置：
- `~/.config/reveille/tasks.json` — タスク定義
- `~/.config/reveille/executions.json` — 実行履歴
- `~/.local/share/reveille/logs/<task-id>/` — 完全なログファイル

### Ink (React for CLI)

Claude Codeと同じエコシステム (TypeScript + Node.js) を採用。理由：
- ターゲットユーザーは既にNode.jsをインストール済み
- `npx reveille` でゼロインストール実行可能
- OSSコントリビューションの障壁が低い（JS/TSは最も普及した言語）

### cron式の採用

launchdは `StartCalendarInterval` という独自形式を使うが、
ユーザー向けインターフェースはcron式を採用。理由：
- 開発者にとって普遍的に理解しやすい
- `cron-parser` / `cronstrue` で変換・可読化が容易
- 内部で launchd 形式に変換 (`src/lib/scheduler.ts`)

変換ルール：
- `*/N * * * *` → `StartInterval` (秒数)
- それ以外 → `StartCalendarInterval` (dict)

## エージェントプリセット

`src/lib/agents.ts` に定義。各エージェントの非対話実行フラグ：

| Agent | Command template |
|-------|-----------------|
| Claude Code | `claude -p "..." --dangerously-skip-permissions` |
| Codex CLI | `codex -q "..."` |
| Gemini CLI | `gemini -p "..."` |
| Aider | `aider --message "..."` |
| Custom | ユーザー定義 |

## launchd plist生成の注意点

- ユーザーのシェルから `PATH` を取得して plist の `EnvironmentVariables` に注入
  (`scheduler.ts` の `getUserPath()`)
- これがないと launchd の最小限環境で agent バイナリが見つからない
- `RunAtLoad: false` にしている（ログイン時に即実行しない）

## ビルド

- tsup でバンドル。shebang は `tsup.config.ts` の `banner` で挿入
- `bin/reveille.ts` にはshebangを書かない（二重挿入になる）
- Ink関連パッケージは `external` 指定（バンドルに含めない）

## テスト

```bash
npm test          # vitest run
npm run test:watch  # vitest (watch mode)
```

テストはタスクCRUD、plistシリアライズ、cron変換、フォーマットをカバー。
実行時に `~/.config/reveille/` に実ファイルを読み書きするため、
テスト前後でクリーンアップしている。
