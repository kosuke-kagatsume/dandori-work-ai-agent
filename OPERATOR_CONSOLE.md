# 🎯 Operator Console - ダンドリワーク運用管理画面

## 概要

Operator Consoleは、AIエージェントシステムの上に構築された**薄い運用管理レイヤー**です。
既存のSaaSを変更することなく、承認・期限管理・例外対応を一元化します。

## 🚀 クイックスタート

```bash
# 起動（Console API + SPA）
./start-operator-console.sh

# または個別起動
cd apps/console-api && npm run dev  # API (port 8787)
cd apps/console && npm run dev       # SPA (port 3000)
```

## 📱 アクセスURL

- **Operator Console**: http://localhost:3000
- **Console API**: http://localhost:8787
- **Health Check**: http://localhost:8787/health

## 🎨 主要機能

### 1. My Queue（承認待ちリスト）
- 自分宛の承認/電話/メール/添付/招待タスク一覧
- **SLA色分け**:
  - 🟢 緑: 4時間以上の余裕
  - 🟡 黄: 1-4時間（要注意）
  - 🔴 赤: 1時間未満または期限切れ

### 2. 全体SLAボード
- 今日期限の件数
- 期限切れ件数
- 3日以上放置の件数
- リスク案件数

### 3. ワンクリック操作
- **承認して送信**: メール送信/招待確定/添付確定
- **翌営業日に延期**: 次の営業日9:00に再スケジュール
- **差し戻し**: 理由入力→下書きへ戻し、担当へ通知

### 4. キルスイッチ
- 案件単位で自動化のON/OFF切替
- 緊急時の自動処理停止

## 🏗️ アーキテクチャ

```
[Operator Console SPA] 
   ↓ fetch
[Console API (BFF)]  ←→  [Hub Dispatcher]  ←→  [各種SaaS]
                            (既存システム)
```

## 📋 API仕様

### Queue取得
```
GET /api/queue?user_id={id}&scope=sales|training&status=open|due|overdue
```

### SLAボード取得
```
GET /api/sla/board?scope=sales|training
```

### アクション実行
```
POST /api/actions/approve_send
POST /api/actions/defer_next_bd
POST /api/actions/reject
POST /api/automation/toggle
```

すべてのPOSTリクエストには`Idempotency-Key`ヘッダーが必要です。

## 🔒 セキュリティ

- Idempotency-Keyによる重複実行防止
- ログ出力（JSONライン形式）
- 環境変数による設定管理

## 📝 使用シナリオ

### Sales フロー
1. Webフォームから問い合わせが自動入力
2. AIエージェントが下書き作成
3. **Operator Consoleで人間が承認**
4. 承認後、自動送信

### Training フロー
1. 契約締結イベントが自動検知
2. 8回分のセッションドラフト自動生成
3. **Operator Consoleで人間が確認・調整**
4. カレンダー招待の一括送信

## 🎯 今後の拡張予定

- [ ] Google OAuth / Zoho SSO認証
- [ ] リアルタイム通知（WebSocket）
- [ ] 詳細ログビューア
- [ ] カスタムダッシュボード
- [ ] レポート生成機能