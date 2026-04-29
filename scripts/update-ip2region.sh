#!/bin/bash
# scripts/update-ip2region.sh
# ---------------------------------------------------------
# 用於 crontab 定期更新 ip2region (v4/v6) 與 geoip-lite 資料庫的腳本
# 建議設定每月執行一次，例如: 0 3 1 * * /path/to/update-ip2region.sh
# ---------------------------------------------------------

# 設定目錄 (請確保這個路徑與您的伺服器配置相符，預設為腳本所在目錄的上層的 backend/data)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/backend/data"
DB_PATH="$DATA_DIR/ip2region.xdb"
DB_V6_PATH="$DATA_DIR/ip2region_v6.xdb"

if [ -f "$PROJECT_DIR/backend/.env" ]; then
    set -a
    . "$PROJECT_DIR/backend/.env"
    set +a
fi

# 下載網址 (從 GitHub 官方倉庫下載)
URL="https://github.com/lionsoul2014/ip2region/raw/refs/heads/master/data/ip2region_v4.xdb"
URL_V6="https://github.com/lionsoul2014/ip2region/raw/refs/heads/master/data/ip2region_v6.xdb"

echo "=========================================="
echo "開始更新 IP 數據庫..."
echo "=========================================="

# 確保資料夾存在
mkdir -p "$DATA_DIR"

# 1. 更新 ip2region (IPv4)
echo "下載 ip2region (IPv4)..."
if curl -f -L -o "$DB_PATH.tmp" "$URL"; then
    mv "$DB_PATH.tmp" "$DB_PATH"
    echo "✅ ip2region v4 下載成功"
else
    echo "❌ ip2region v4 下載失敗！"
    rm -f "$DB_PATH.tmp"
fi

# 2. 更新 ip2region (IPv6)
echo "下載 ip2region (IPv6)..."
if curl -f -L -o "$DB_V6_PATH.tmp" "$URL_V6"; then
    mv "$DB_V6_PATH.tmp" "$DB_V6_PATH"
    echo "✅ ip2region v6 下載成功"
else
    echo "❌ ip2region v6 下載失敗！"
    rm -f "$DB_V6_PATH.tmp"
fi

# 3. 更新 geoip-lite (海外精準庫)
echo "更新 geoip-lite 內建資料庫..."
cd "$PROJECT_DIR/backend" || exit
if command -v npm &> /dev/null; then
    npm run updatedb || npx geoip-lite-update
    echo "✅ geoip-lite 資料庫更新完成"
else
    echo "⚠️ 找不到 npm，跳過 geoip-lite 更新"
fi

if [ -n "$MAXMIND_LICENSE_KEY" ]; then
    echo "更新 MaxMind GeoLite2 (City/ASN)..."
    for EDITION in "GeoLite2-City" "GeoLite2-ASN"; do
        TMP_DIR="$(mktemp -d)"
        TAR_PATH="$TMP_DIR/${EDITION}.tar.gz"
        OUT_PATH="$DATA_DIR/${EDITION}.mmdb"
        URL_MM="https://download.maxmind.com/app/geoip_download?edition_id=${EDITION}&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz"
        if curl -f -L -o "$TAR_PATH" "$URL_MM"; then
            tar -xzf "$TAR_PATH" -C "$TMP_DIR"
            FOUND="$(find "$TMP_DIR" -name "${EDITION}.mmdb" | head -n 1)"
            if [ -n "$FOUND" ]; then
                mv "$FOUND" "$OUT_PATH"
                echo "✅ ${EDITION} 更新成功"
            else
                echo "❌ ${EDITION} 解壓後找不到 mmdb"
            fi
        else
            echo "❌ ${EDITION} 下載失敗"
        fi
        rm -rf "$TMP_DIR"
    done
else
    echo "⚠️ 未設定 MAXMIND_LICENSE_KEY，跳過 GeoLite2 下載"
fi

# 重啟後端服務讓記憶體重新載入最新的資料庫
echo "⏳ 正在重啟後端服務..."
if command -v pm2 &> /dev/null; then
    pm2 restart ztmy-gallery-api
    echo "✅ 已重啟後端服務 (pm2 restart ztmy-gallery-api)"
else
    echo "⚠️ 未偵測到 pm2 命令，請確保手動重啟您的後端服務讓設定生效。"
fi
