#!/bin/bash
# scripts/update-ip2region.sh
# ---------------------------------------------------------
# 用於 crontab 定期更新 ip2region.xdb 檔案的腳本
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
echo "開始更新 ip2region 數據庫..."
echo "目標路徑: $DB_PATH"
echo "=========================================="

# 確保資料夾存在
mkdir -p "$DATA_DIR"

# 使用 curl 下載 (-f 失敗不輸出, -L 跟隨重定向, -o 輸出檔案)
if curl -f -L -o "$DB_PATH.tmp" "$URL"; then
    # 覆蓋舊檔案
    mv "$DB_PATH.tmp" "$DB_PATH"
    echo "✅ 下載成功，檔案已更新至 $DB_PATH"
    
    # 重啟後端服務讓記憶體重新載入最新的 xdb
    echo "⏳ 正在重啟後端服務..."
    if command -v pm2 &> /dev/null; then
        pm2 restart ztmy-gallery-api
        echo "✅ 已重啟後端服務 (pm2 restart ztmy-gallery-api)"
    else
        echo "⚠️ 未偵測到 pm2 命令，請確保手動重啟您的後端服務讓設定生效。"
    fi
else
    echo "❌ 下載失敗！請檢查網路連線或 GitHub 存取狀態。"
    rm -f "$DB_PATH.tmp"
    exit 1
fi
