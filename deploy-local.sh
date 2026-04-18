#!/bin/bash
# ==========================================
# ZUTOMAYO MV Gallery - 本地打包與遠端發佈腳本
# 解決伺服器記憶體不足無法編譯前端的問題
# ==========================================

# 確保腳本在錯誤時停止執行
set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 伺服器設定
SERVER="server1"
REMOTE_PROJECT_DIR="/opt/zutomayo-gallery"
REMOTE_WWW_DIR="/www/wwwroot/mv.ztmr.club"

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN} 1. 開始本地打包前端...${NC}"
echo -e "${GREEN}==========================================${NC}"
cd frontend

# 使用 npm (或 pnpm) 進行安裝與編譯
if command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}偵測到 pnpm，正在安裝依賴...${NC}"
    pnpm install
    echo -e "${YELLOW}正在打包...${NC}"
    pnpm run build
else
    echo -e "${YELLOW}使用 npm 安裝依賴...${NC}"
    npm install
    echo -e "${YELLOW}正在打包...${NC}"
    npm run build
fi
cd ..

echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN} 2. 正在上傳前端靜態檔案至伺服器...${NC}"
echo -e "${GREEN}==========================================${NC}"

# 清空伺服器上的舊靜態檔案
echo -e "${YELLOW}清空伺服器舊檔案 (${REMOTE_WWW_DIR})...${NC}"
ssh ${SERVER} "rm -rf ${REMOTE_WWW_DIR}/*"

# 使用 scp 將新打包的 dist 目錄內容上傳
echo -e "${YELLOW}正在上傳新檔案...${NC}"
scp -r frontend/dist/* ${SERVER}:${REMOTE_WWW_DIR}/
echo -e "${GREEN}前端檔案上傳成功！${NC}"

echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN} 3. 更新遠端後端服務...${NC}"
echo -e "${GREEN}==========================================${NC}"
# 遠端執行指令：拉取最新程式碼，並只執行後端部署 (選項 3)，自動確認 env 檔案 (輸入 y)
ssh ${SERVER} "cd ${REMOTE_PROJECT_DIR} && git pull origin main && echo -e '3\ny\n' | ./deploy.sh"

echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN} 部署完成！🎉 你的網站已經更新到最新版本！${NC}"
echo -e "${GREEN}==========================================${NC}"
