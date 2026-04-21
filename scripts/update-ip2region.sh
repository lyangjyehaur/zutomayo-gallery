#!/bin/bash
# scripts/update-ip2region.sh
# ---------------------------------------------------------
# 用於 crontab 定期更新 ip2region.xdb 與 DB-IP 檔案的腳本
# 建議設定每月執行一次，例如: 0 3 1 * * /path/to/update-ip2region.sh
# ---------------------------------------------------------

# 設定目錄 (請確保這個路徑與您的伺服器配置相符，預設為腳本所在目錄的上層的 backend/data)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/backend/data"
DB_PATH="$DATA_DIR/ip2region.xdb"

# 下載網址 (從 GitHub 官方倉庫下載)
URL="https://github.com/lionsoul2014/ip2region/raw/refs/heads/master/data/ip2region_v4.xdb"

echo "=========================================="
echo "開始更新 IP 數據庫..."
echo "=========================================="

# 確保資料夾存在
mkdir -p "$DATA_DIR"

# 1. 更新 ip2region
echo "下載 ip2region (中國大陸精準庫)..."
if curl -f -L -o "$DB_PATH.tmp" "$URL"; then
    mv "$DB_PATH.tmp" "$DB_PATH"
    echo "✅ ip2region 下載成功"
else
    echo "❌ ip2region 下載失敗！"
    rm -f "$DB_PATH.tmp"
fi

# 2. 更新 geoip-lite (海外精準庫)
echo "更新 geoip-lite 內建資料庫..."
cd "$PROJECT_DIR/backend" || exit
if command -v npm &> /dev/null; then
    npm run updatedb || npx geoip-lite-update
    echo "✅ geoip-lite 資料庫更新完成"
else
    echo "⚠️ 找不到 npm，跳過 geoip-lite 更新"
fi

# 重啟後端服務讓記憶體重新載入最新的資料庫
echo "⏳ 正在重啟後端服務..."
if command -v pm2 &> /dev/null; then
    pm2 restart ztmy-gallery-api
    echo "✅ 已重啟後端服務 (pm2 restart ztmy-gallery-api)"
else
    echo "⚠️ 未偵測到 pm2 命令，請確保手動重啟您的後端服務讓設定生效。"
fi

