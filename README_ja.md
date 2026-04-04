# reveille

macOS向け AIエージェント タスクスケジューラ。Claude Code、Codex、Gemini などのAIエージェントをlaunchdで自動定期実行できます。開発の自動化から日々のルーティンまで。

```
$ reveille list

  reveille - Tasks

  ID       NAME              AGENT    SCHEDULE              STATUS      LAST RUN
  ─────────────────────────────────────────────────────────────────────────────────
  a1b2c3d4 Run tests         claude   At 09:03 AM           ● active    3 hours ago
  e5f6g7h8 Daily note        claude   At 08:00 AM           ● active    12 hours ago
  i9j0k1l2 Update deps       codex    At 12:00 AM, Mon      ● paused    3 days ago

  3 task(s)
```

## なぜ reveille？

Claude Code のようなAIエージェントは、単なるコーディングツールではありません。日々のパートナーとして活用できます。テスト実行やlint修正といった開発タスクはもちろん、デイリーノートの作成、ジャーナリング、一日の振り返りといった個人的なルーティンも自動化できます。しかし、これらを定期実行するには launchd の plist を手書きし、環境変数を設定し、ログを管理する必要があります。

reveille はこのギャップを埋めます：

- **コマンド一発でスケジュール設定** — plist XMLの手書きも `launchctl` 操作も不要
- **AIエージェント専用設計** — Claude Code、Codex、Gemini、Aider のプリセット搭載
- **コードだけじゃない** — デイリーノート、振り返り、あらゆる定期タスクをスケジュール
- **実行追跡** — すべての実行がステータス・所要時間・出力とともに記録される
- **TUIダッシュボード** — スケジュール済みエージェントを一画面で監視

## インストール

```bash
npm install -g agent-reveille
```

または直接実行：

```bash
npx agent-reveille
```

Node.js 20 以上が必要です。

## クイックスタート

### 1. タスクを作成する

対話式ウィザード：

```bash
reveille add
```

または非対話式：

```bash
reveille add \
  --name "毎朝テスト" \
  --agent claude \
  --cmd 'claude -p "テストスイートを実行し、失敗があれば修正してください" --dangerously-skip-permissions' \
  --cron "3 9 * * *" \
  --dir ~/projects/my-app
```

### 2. タスクを確認する

```bash
reveille list
```

### 3. タスクを即時実行する

```bash
reveille run <task-id>
```

### 4. 実行履歴を見る

```bash
reveille logs <task-id>
```

### 5. ダッシュボードを開く

```bash
reveille
```

## コマンド一覧

| コマンド                | 説明                                               |
| ----------------------- | -------------------------------------------------- |
| `reveille add`          | 新しいスケジュールタスクを作成（対話式ウィザード） |
| `reveille list`         | 全タスクをステータス・最終実行時刻とともに一覧表示 |
| `reveille run <id>`     | タスクを即時実行                                   |
| `reveille logs [id]`    | 実行履歴を表示                                     |
| `reveille enable <id>`  | スケジュールを有効化（launchd plistをロード）      |
| `reveille disable <id>` | スケジュールを無効化（launchd plistをアンロード）  |
| `reveille remove <id>`  | タスクとplistを削除                                |
| `reveille dashboard`    | TUIダッシュボードを開く（デフォルト動作）          |

## ダッシュボード

対話式ダッシュボードで、スケジュール済みタスクの全体像を把握できます。

```
  reveille - AI Agent Task Scheduler              v0.1.0
  ──────────────────────────────────────────────────────────────────────
    Tasks

  ❯ a1b2c3d4 Run tests      claude  At 09:03 AM       ● active  3h ago
    e5f6g7h8 Lint & fix      claude  Every 2 hours     ● active  45m ago

  ──────────────────────────────────────────────────────────────────────
  Run tests (a1b2c3d4)
  Command: claude -p "run the test suite" --dangerously-skip-permissions
  Dir:     /Users/you/projects/my-app

  Last Execution:
    ✓ success | Duration: 2m 34s | Exit: 0
    All 47 tests passed.

  j/k navigate  a add  r remove  space toggle  R run now  l logs  q quit
```

**キーバインド：**

| キー      | 操作                     |
| --------- | ------------------------ |
| `j` / `k` | 上下に移動               |
| `a`       | 新しいタスクを追加       |
| `r`       | 選択中のタスクを削除     |
| `Space`   | 有効/無効を切り替え      |
| `R`       | 選択中のタスクを即時実行 |
| `l`       | ログを表示               |
| `q`       | 終了                     |

## 対応エージェント

| エージェント | バイナリ | 非対話実行フラグ                                 |
| ------------ | -------- | ------------------------------------------------ |
| Claude Code  | `claude` | `-p "プロンプト" --dangerously-skip-permissions` |
| Codex CLI    | `codex`  | `-q "プロンプト"`                                |
| Gemini CLI   | `gemini` | `-p "プロンプト"`                                |
| Aider        | `aider`  | `--message "プロンプト"`                         |
| カスタム     | 任意     | ユーザー定義コマンド                             |

reveille はシステムにインストール済みのエージェントを自動検出します。

## 仕組み

### アーキテクチャ

```
┌──────────┐     ┌──────────────────┐     ┌──────────────────┐
│  launchd  │────▶│  reveille run <id> │────▶│  AI Agent CLI    │
│  (macOS)  │     │  (executor)      │     │  (claude, etc.)  │
└──────────┘     └──────────────────┘     └──────────────────┘
                         │
                         ▼
                 ┌──────────────────┐
                 │  ログ & ステータス │
                 │  (~/.config/     │
                 │   reveille/)       │
                 └──────────────────┘
```

reveille は launchd から AI エージェントを **直接呼び出しません**。生成されたplistは `reveille run <task-id>` を実行し、その中で：

1. 実行開始を記録
2. 適切な環境変数でエージェントコマンドを起動
3. stdout/stderr をログファイルにキャプチャ
4. 結果（終了コード、所要時間、ステータス）を記録

これにより、追加の設定なしで完全な実行追跡が得られます。

### launchd 連携

スケジュールタスクを作成すると、reveille は以下を行います：

1. `~/Library/LaunchAgents/com.reveille.task.<id>.plist` にplistファイルを生成
2. cron式を launchd の `StartCalendarInterval` または `StartInterval` に変換
3. シェルの `PATH` を注入してエージェントバイナリが見つかるようにする
4. `launchctl load` でplistをロード

crontab と異なり、launchd はスリープ/復帰サイクルに対応しており、macOS ネイティブのスケジューラです。

### データ保存先

| パス                                               | 内容                              |
| -------------------------------------------------- | --------------------------------- |
| `~/.config/reveille/tasks.json`                    | タスク定義                        |
| `~/.config/reveille/executions.json`               | 実行履歴                          |
| `~/.local/share/reveille/logs/<task-id>/`          | 完全な stdout/stderr ログファイル |
| `~/Library/LaunchAgents/com.reveille.task.*.plist` | 生成された launchd plist          |

## 使用例

### 毎朝テストを実行

```bash
reveille add \
  --name "朝のテスト" \
  --cmd 'claude -p "全テストを実行し、失敗を修正してコミットしてください" --dangerously-skip-permissions' \
  --cron "3 9 * * *" \
  --dir ~/projects/my-app
```

### 2時間ごとにlintチェック

```bash
reveille add \
  --name "Lint巡回" \
  --cmd 'claude -p "linterを実行し、すべての警告を修正してください" --dangerously-skip-permissions' \
  --cron "7 */2 * * *" \
  --dir ~/projects/my-app
```

### 毎週の依存関係アップデート

```bash
reveille add \
  --name "依存関係更新" \
  --cmd 'claude -p "すべての依存関係を最新の互換バージョンに更新し、テストを実行し、パスすればコミットしてください" --dangerously-skip-permissions' \
  --cron "0 10 * * 1" \
  --dir ~/projects/my-app
```

### 毎朝デイリーノートを作成

```bash
reveille add \
  --name "デイリーノート" \
  --agent claude \
  --cmd 'claude -p "~/notes/ に今日のデイリーノートを作成してください。日付、各プロジェクトの最近のgit活動の要約、TODOセクションを含めてください。" --dangerously-skip-permissions' \
  --cron "0 8 * * *" \
  --dir ~/notes
```

### 一日の終わりに振り返り

```bash
reveille add \
  --name "夕方の振り返り" \
  --agent claude \
  --cmd 'claude -p "gitログとTODOをもとに今日の作業を振り返り、~/notes/reflections/ に簡潔な振り返りを書いてください。成果、ブロッカー、明日の重点を含めてください。" --dangerously-skip-permissions' \
  --cron "0 18 * * 1-5" \
  --dir ~/notes
```

### 手動タスク（オンデマンド実行のみ）

```bash
reveille add \
  --name "フルレビュー" \
  --cmd 'claude -p "コードベース全体のセキュリティ問題をレビューしてください" --dangerously-skip-permissions' \
  --dir ~/projects/my-app
# スケジュールタイプで "Manual only" を選択
```

## cron式リファレンス

| 式             | 意味           |
| -------------- | -------------- |
| `0 9 * * *`    | 毎日 9:00      |
| `*/30 * * * *` | 30分ごと       |
| `0 */2 * * *`  | 2時間ごと      |
| `0 10 * * 1`   | 毎週月曜 10:00 |
| `0 0 1 * *`    | 毎月1日 0:00   |

## Claude Code 連携

reveille には [Claude Code スキル](https://docs.anthropic.com/en/docs/claude-code/skills)が同梱されており、Claude Code の会話からスケジュールタスクを直接管理できます。

### セットアップ

このプロジェクトを Claude Code で開くとスキルが自動的に利用可能になります。

### 使い方

`/reveille` に続けてやりたいことを入力するだけです：

```
/reveille 毎朝9時にテストをスケジュールして
/reveille タスクを見せて
/reveille タスク a1b2c3d4 のログを確認して
```

Claude Code がリクエストを適切な `reveille` コマンドに変換して実行します。

## 開発

```bash
git clone https://github.com/mori-ri/agent-reveille.git
cd reveille
npm install

# 開発モードで実行
npx tsx bin/reveille.ts --help
npx tsx bin/reveille.ts add
npx tsx bin/reveille.ts list

# テスト実行
npm test

# ビルド
npm run build
```

## ライセンス

MIT
