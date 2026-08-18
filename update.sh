#!/bin/bash

# Zutomayo Gallery - 線上增量更新腳本
# 用途：自動拉取最新程式碼，安裝依賴，執行資料庫遷移，並重啟服務

set -e

cd "$(dirname "$0")"

CONFIG_FILE="${CONFIG_FILE:-deploy.conf}"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Missing deployment config: $CONFIG_FILE" >&2
    exit 1
fi
source "$CONFIG_FILE"
: "${BACKEND_CONTAINER_NAME:?Set BACKEND_CONTAINER_NAME in ${CONFIG_FILE}}"
: "${BACKEND_HEALTH_ORIGIN:?Set BACKEND_HEALTH_ORIGIN in ${CONFIG_FILE}}"

echo "========================================="
echo " Zutomayo Gallery - Update Script"
echo "========================================="

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
docker restart "$BACKEND_CONTAINER_NAME"

HTTP_STATUS=""
for attempt in $(seq 1 15); do
    HTTP_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "${BACKEND_HEALTH_ORIGIN}/health" || true)"
    if [ "$HTTP_STATUS" = "200" ]; then
        break
    fi
    sleep 2
done
if [ "$HTTP_STATUS" != "200" ]; then
    echo "Backend health check failed (HTTP ${HTTP_STATUS:-unknown})." >&2
    docker logs --tail 50 "$BACKEND_CONTAINER_NAME" >&2 || true
    exit 1
fi

echo "========================================="
echo " Update completed successfully!"
echo "========================================="
