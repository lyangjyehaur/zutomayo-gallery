#!/bin/bash
set -e

# ==========================================
# Zutomayo Gallery - 升級生產庫至 V2 架構腳本
# ==========================================

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}開始執行資料庫升級流程...${NC}"

# 連線資訊設定
REMOTE_HOST="127.0.0.1" # 透過 autossh 轉發
REMOTE_PORT="5432"
REMOTE_USER="zutomayo_gallery"
REMOTE_DB="zutomayo_gallery"
REMOTE_PASS="FBZNYC3HSJExdHX3"

LOCAL_HOST="127.0.0.1"
LOCAL_PORT="5432"
LOCAL_USER="zutomayo_gallery_test"
LOCAL_DB="zutomayo_gallery_test"
LOCAL_PASS="XCFHbZQyn33KeY66"

# 檢查是否安裝 psql 與 pg_dump
if ! command -v pg_dump &> /dev/null || ! command -v psql &> /dev/null; then
    echo -e "${RED}錯誤：未找到 pg_dump 或 psql 命令，請先安裝 PostgreSQL 用戶端工具。${NC}"
    exit 1
fi

# 1. 備份生產庫
BACKUP_FILE="prod_v1_backup_$(date +%Y%m%d_%H%M%S).sql"
echo -e "\n${YELLOW}[1/4] 正在備份遠端生產庫 (${REMOTE_DB}) 至 ${BACKUP_FILE}...${NC}"
PGPASSWORD=$REMOTE_PASS pg_dump -h $REMOTE_HOST -p $REMOTE_PORT -U $REMOTE_USER -d $REMOTE_DB > "$BACKUP_FILE"
echo -e "${GREEN}✓ 生產庫備份成功！${NC}"

# 2. 匯出測試庫 (不包含 owner 資訊，避免匯入時權限錯誤)
EXPORT_FILE="v2_test_data.sql"
echo -e "\n${YELLOW}[2/4] 正在匯出本地測試庫 (${LOCAL_DB}) 至 ${EXPORT_FILE}...${NC}"
PGPASSWORD=$LOCAL_PASS pg_dump -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -O -x > "$EXPORT_FILE"
echo -e "${GREEN}✓ 測試庫匯出成功！${NC}"

# 3. 清空生產庫舊資料 (不刪除 Schema, 而是刪除裡面的 Table)
echo -e "\n${YELLOW}[3/4] 正在清空遠端生產庫舊架構 (將刪除所有舊表)...${NC}"
# 生成刪除所有 table 的指令
DROP_COMMANDS=$(PGPASSWORD=$REMOTE_PASS psql -h $REMOTE_HOST -p $REMOTE_PORT -U $REMOTE_USER -d $REMOTE_DB -t -c "SELECT 'DROP TABLE IF EXISTS \"' || tablename || '\" CASCADE;' FROM pg_tables WHERE schemaname = 'public';")
if [ -n "$DROP_COMMANDS" ]; then
    PGPASSWORD=$REMOTE_PASS psql -h $REMOTE_HOST -p $REMOTE_PORT -U $REMOTE_USER -d $REMOTE_DB -c "$DROP_COMMANDS"
fi
echo -e "${GREEN}✓ 生產庫舊架構已清空！${NC}"

# 4. 匯入新架構與資料
echo -e "\n${YELLOW}[4/4] 正在將 V2 架構與資料匯入至遠端生產庫...${NC}"
PGPASSWORD=$REMOTE_PASS psql -h $REMOTE_HOST -p $REMOTE_PORT -U $REMOTE_USER -d $REMOTE_DB < "$EXPORT_FILE"
echo -e "${GREEN}✓ V2 資料匯入成功！${NC}"

echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN}🎉 資料庫 V2 升級流程已全部完成！${NC}"
echo -e "${YELLOW}請記得提交代碼 (git commit) 並連線至伺服器進行線上部署。${NC}"
echo -e "${GREEN}==========================================${NC}"