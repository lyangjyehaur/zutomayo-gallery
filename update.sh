#!/bin/bash

# Zutomayo Gallery - 線上增量更新腳本
# 用途：自動拉取最新程式碼，安裝依賴，執行資料庫遷移，並重啟服務

set -e

echo "========================================="
echo " Zutomayo Gallery - Update Script"
echo "========================================="

# 1. 確保在專案根目錄
cd "$(dirname "$0")"

echo "=> [1/5] Pulling latest code from git..."
git pull origin main

echo "=> [2/5] Installing dependencies..."
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd review-app && npm install && cd ..

echo "=> [3/5] Building frontend, review-app and backend..."
npm run build:all

echo "=> [4/5] Running database migrations..."
cd backend
npm run migrate
cd ..

echo "=> [5/5] Restarting services..."
# 假設使用 PM2 管理進程，若使用 Docker 可以改為 docker-compose restart
if command -v pm2 &> /dev/null; then
    echo "Restarting via PM2..."
    pm2 reload all
else
    echo "PM2 not found. Please restart your services manually."
    echo "Example: npm run dev"
fi

echo "========================================="
echo " Update completed successfully!"
echo "========================================="
