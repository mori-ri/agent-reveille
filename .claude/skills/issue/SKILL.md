---
name: issue
description: "GitHub Issueを作成する。ざっくりした要求を深掘りし、コードベースを調査して実装計画を立て、構造化されたIssueを登録する。'/issue ログ表示を改善したい', '/issue タスクのタグ機能を追加', '/issue cronの検証が甘い' のように使う。"
allowed-tools: Bash(gh issue *), Bash(gh label *), Bash(gh api *), Bash(git log *), Bash(git diff *), Read, Glob, Grep, Agent, AskUserQuestion
argument-hint: "<ざっくりした要求>"
---

# Issue — GitHub Issue 作成

ざっくりとした要求を深掘りし、コードベースを調査して、構造化された GitHub Issue を作成する。

## Workflow

### 1. 要求の理解とコードベース調査

ユーザーの要求 `$ARGUMENTS` を受け取ったら、まず関連するコードベースを調査する。

- `Explore` Agent を使って、要求に関連するソースファイル、テスト、型定義を特定する
- 現状の実装がどうなっているか把握する
- 関連する既存の Issue がないか確認する:

```bash
gh issue list --repo mori-ri/agent-reveille --state open --json number,title --limit 20
```

### 2. 要求の深掘り

調査結果をもとに、AskUserQuestion で要求を具体化する。以下の観点で質問を組み立てる:

- **スコープ**: どこまでやるか（MVP vs フル機能）
- **優先度**: 何が一番重要か
- **制約**: 既存の挙動を変えてよいか、後方互換性は必要か
- **ユースケース**: 具体的にどういう場面で使うか

質問は1回にまとめる（最大4問）。調査で判明した具体的な選択肢を提示すること。コードを読んで分かることは聞かない。

### 3. 実装計画の策定

深掘り結果をもとに、実装計画を立てる:

- 変更が必要なファイルを特定する
- 実装ステップを洗い出す
- テスト方針を決める（ユニットテスト + E2E テスト）
- 影響範囲を整理する

### 4. Issue の作成

以下のフォーマットで GitHub Issue を作成する:

```bash
gh issue create --repo mori-ri/agent-reveille --title "<タイトル>" --body "$(cat <<'EOF'
## 概要

<何を・なぜやるか — 1-3文>

## 現状の問題

<現状どうなっていて何が不足/問題か — 箇条書き>

## 改善内容

### 1. <改善項目>
- <詳細>

### 2. <改善項目>
- <詳細>

## 対象ファイル
- `<ファイルパス>` — <変更内容の概要>

## テスト方針
- <ユニットテスト: 何をテストするか>
- <E2Eテスト: 何をテストするか>

## 備考
- <制約、依存関係、注意点など>
EOF
)"
```

ラベルが適切な場合は `--label` で付与する。利用可能なラベル:

```bash
gh label list --repo mori-ri/agent-reveille
```

### 5. 結果報告

作成した Issue の URL と概要を簡潔に報告する。

## ガイドライン

- タイトルは具体的かつ簡潔に（「改善」「修正」だけでなく、何を改善/修正するか書く）
- 概要は「何を」「なぜ」を明確に
- 対象ファイルはコードベース調査に基づく正確なパスを記載する
- テスト方針は CLAUDE.md の TDD 方針に沿う
- 既存 Issue と重複する場合はユーザーに確認してから作成する
- 1つの Issue に複数の独立した変更を詰め込まない — 大きすぎる場合は分割を提案する

## User Request

$ARGUMENTS
