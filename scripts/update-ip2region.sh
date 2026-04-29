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

# 3. 更新 MaxMind GeoLite2 (City + ASN)
if [ -z "${MAXMIND_LICENSE_KEY}" ]; then
    echo "⚠️ 未設定 MAXMIND_LICENSE_KEY，跳過 GeoLite2 下載。"
else
    TMP_DIR="$(mktemp -d)"
    CITY_URL="https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz"
    ASN_URL="https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-ASN&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz"

    echo "下載 GeoLite2-City..."
    if curl -f -L -o "${TMP_DIR}/GeoLite2-City.tar.gz" "${CITY_URL}"; then
        tar -xzf "${TMP_DIR}/GeoLite2-City.tar.gz" -C "${TMP_DIR}"
        CITY_MMDB="$(find "${TMP_DIR}" -name "GeoLite2-City.mmdb" -type f | head -n 1)"
        if [ -n "${CITY_MMDB}" ]; then
            cp "${CITY_MMDB}" "${DATA_DIR}/GeoLite2-City.mmdb"
            echo "✅ GeoLite2-City 更新完成"
        else
            echo "❌ 找不到 GeoLite2-City.mmdb"
        fi
    else
        echo "❌ GeoLite2-City 下載失敗！"
    fi

    echo "下載 GeoLite2-ASN..."
    if curl -f -L -o "${TMP_DIR}/GeoLite2-ASN.tar.gz" "${ASN_URL}"; then
        tar -xzf "${TMP_DIR}/GeoLite2-ASN.tar.gz" -C "${TMP_DIR}"
        ASN_MMDB="$(find "${TMP_DIR}" -name "GeoLite2-ASN.mmdb" -type f | head -n 1)"
        if [ -n "${ASN_MMDB}" ]; then
            cp "${ASN_MMDB}" "${DATA_DIR}/GeoLite2-ASN.mmdb"
            echo "✅ GeoLite2-ASN 更新完成"
        else
            echo "❌ 找不到 GeoLite2-ASN.mmdb"
        fi
    else
        echo "❌ GeoLite2-ASN 下載失敗！"
    fi

    rm -rf "${TMP_DIR}"
fi

# 重啟後端服務讓記憶體重新載入最新的資料庫
echo "⏳ 正在重啟後端服務..."
if command -v pm2 &> /dev/null; then
    pm2 restart ztmy-gallery-api
    echo "✅ 已重啟後端服務 (pm2 restart ztmy-gallery-api)"
else
    echo "⚠️ 未偵測到 pm2 命令，請確保手動重啟您的後端服務讓設定生效。"
fi
