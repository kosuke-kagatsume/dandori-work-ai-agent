#!/bin/bash

echo "🚀 Starting Operator Console System..."

# Console APIを起動（バックグラウンド）
echo "Starting Console API on port 8787..."
cd apps/console-api
npm run dev &
API_PID=$!

# 少し待機
sleep 3

# Operator Console SPAを起動
echo "Starting Operator Console on port 3000..."
cd ../console
npm run dev &
SPA_PID=$!

echo ""
echo "✅ Operator Console is running!"
echo "   - Console API: http://localhost:8787"
echo "   - Operator Console: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Ctrl+Cで両方のプロセスを終了
trap "kill $API_PID $SPA_PID 2>/dev/null" EXIT

# プロセスが終了するまで待機
wait