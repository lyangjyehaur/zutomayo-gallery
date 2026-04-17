#!/bin/bash

# ==========================================
# ZUTOMAYO MV Gallery - 伺服器部署與啟動腳本
# ==========================================

# 確保腳本在錯誤時停止執行
set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

CONFIG_FILE="deploy.conf"

# ==========================================
# 工具檢查
# ==========================================
# 確保我們在專案根目錄執行 (透過檢查是否存在 package.json)
if [ ! -f "package.json" ]; then
    echo -e "${RED}錯誤：請在專案根目錄下執行此腳本！${NC}"
    exit 1
fi

if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
    PKG_INSTALL="pnpm install"
    PKG_BUILD="pnpm run build"
    echo -e "${GREEN}偵測到 pnpm，將使用 pnpm 進行套件管理。${NC}"
else
    PKG_MANAGER="npm"
    PKG_INSTALL="npm install"
    PKG_BUILD="npm run build"
    echo -e "${YELLOW}未偵測到 pnpm，降級使用 npm 進行套件管理。${NC}"
fi
# ==========================================
# 1. 檢查並載入部署設定檔
# ==========================================
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}找不到設定檔 $CONFIG_FILE，正在為您建立預設設定檔...${NC}"
    cat <<EOF > "$CONFIG_FILE"
# ==========================================
# 部署設定檔 (deploy.conf)
# ==========================================

# 前端部署目標路徑 (例如: Nginx 的站點目錄)
FRONTEND_DEPLOY_PATH="/www/wwwroot/mv.ztmr.club"

# 前端備份目錄 (每次更新前會將舊檔案備份到這裡)
FRONTEND_BACKUP_PATH="/www/wwwroot/mv_backup"

EOF
    echo -e "${RED}已建立預設 $CONFIG_FILE！${NC}"
    echo -e "${RED}請先編輯 $CONFIG_FILE 確認路徑是否正確，然後再次執行此腳本。${NC}"
    exit 1
fi

# 讀取設定檔變數
source "$CONFIG_FILE"

# ==========================================
# 2. 互動式選單
# ==========================================
echo -e "${GREEN}歡迎使用 ZUTOMAYO MV Gallery 部署工具${NC}"
echo "請選擇要執行的操作："
echo "1) 部署全部 (前端 + 後端)"
echo "2) 僅部署前端 (Frontend)"
echo "3) 僅部署後端 (Backend)"
echo "0) 退出"
read -p "請輸入選項 [1/2/3/0]: " choice

if [ "$choice" == "0" ]; then
    echo "已退出部署。"
    exit 0
fi

if [[ "$choice" != "1" && "$choice" != "2" && "$choice" != "3" ]]; then
    echo -e "${RED}無效的選項！請重新執行腳本。${NC}"
    exit 1
fi

# ==========================================
# 3. 獲取最新程式碼
# ==========================================
echo -e "\n${YELLOW}[Git] 正在拉取最新程式碼...${NC}"
git pull origin main || {
    echo -e "${RED}拉取程式碼失敗，請確認 Git 狀態或是否有衝突！${NC}"
    exit 1
}

# ==========================================
# 4. 檢查與確認 .env 設定
# ==========================================
check_and_edit_env() {
    local env_file=$1
    local env_name=$2
    
    echo -e "\n${YELLOW}=== 檢查 $env_name 環境變數 ===${NC}"
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}警告: 找不到 $env_file 檔案！${NC}"
        
        # 檢查是否有模板檔案
        if [ -f "${env_file}.example" ]; then
            echo -e "正在從模板 (${env_file}.example) 為您建立預設的 $env_file 檔案..."
            cp "${env_file}.example" "$env_file"
        else
            echo -e "正在為您建立一個空的 $env_file 檔案..."
            touch "$env_file"
        fi
    fi
    
    while true; current_content=$(cat "$env_file"); do
        echo -e "\n當前 $env_file 內容如下："
        echo -e "----------------------------------------"
        if [ -z "$current_content" ]; then
            echo -e "${YELLOW}(檔案為空)${NC}"
        else
            echo "$current_content"
        fi
        echo -e "----------------------------------------"
        
        read -p "內容是否正確？輸入 (y)確認繼續 / (e)開啟 vim 編輯: " env_choice
        case $env_choice in
            [Yy]* )
                echo -e "${GREEN}$env_name 環境變數確認完畢。${NC}"
                break
                ;;
            [Ee]* )
                echo -e "正在開啟編輯器..."
                # 優先使用 vim，如果沒有則使用 vi，再沒有則使用 nano
                if command -v vim &> /dev/null; then
                    vim "$env_file"
                elif command -v vi &> /dev/null; then
                    vi "$env_file"
                else
                    nano "$env_file"
                fi
                ;;
            * )
                echo -e "${RED}無效的輸入，請輸入 y 或 e。${NC}"
                ;;
        esac
    done
}

if [[ "$choice" == "1" || "$choice" == "2" ]]; then
    check_and_edit_env "frontend/.env" "前端 (Frontend)"
fi

if [[ "$choice" == "1" || "$choice" == "3" ]]; then
    check_and_edit_env "backend/.env" "後端 (Backend)"
fi

# ==========================================
# 部署前端函式
# ==========================================
deploy_frontend() {
    echo -e "\n${YELLOW}[Frontend] 開始處理前端...${NC}"
    cd frontend
    echo "安裝前端依賴..."
    $PKG_INSTALL
    echo "編譯前端靜態檔案..."
    $PKG_BUILD
    cd ..

    echo -e "\n${YELLOW}[Frontend] 準備備份與發佈前端檔案...${NC}"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="${FRONTEND_BACKUP_PATH}/${TIMESTAMP}"

    # 確保目標與備份目錄存在並有寫入權限
    if [ ! -d "$FRONTEND_DEPLOY_PATH" ]; then
        echo -e "${YELLOW}建立部署目錄: $FRONTEND_DEPLOY_PATH${NC}"
        mkdir -p "$FRONTEND_DEPLOY_PATH" || {
            echo -e "${RED}錯誤: 無法建立部署目錄 $FRONTEND_DEPLOY_PATH，請檢查權限！${NC}"
            exit 1
        }
    fi
    if [ ! -w "$FRONTEND_DEPLOY_PATH" ]; then
        echo -e "${RED}錯誤: 對部署目錄 $FRONTEND_DEPLOY_PATH 沒有寫入權限！請使用 sudo 執行或更改權限。${NC}"
        exit 1
    fi
    mkdir -p "$BACKUP_DIR" || {
        echo -e "${RED}錯誤: 無法建立備份目錄 $BACKUP_DIR，請檢查權限！${NC}"
        exit 1
    }

    # 檢查部署目錄是否為空，如果不為空就執行備份
    if [ "$(ls -A $FRONTEND_DEPLOY_PATH)" ]; then
        echo "正在備份當前線上檔案至 $BACKUP_DIR ..."
        cp -a "$FRONTEND_DEPLOY_PATH/." "$BACKUP_DIR/"
        
        echo "清理舊版線上檔案..."
        # 避免誤刪根目錄，使用 :? 確保變數不為空
        rm -rf "${FRONTEND_DEPLOY_PATH:?}/"*
    else
        echo "部署目錄為空，跳過備份步驟。"
    fi

    echo "正在將新編譯的檔案複製到部署目錄 $FRONTEND_DEPLOY_PATH ..."
    cp -a frontend/dist/. "$FRONTEND_DEPLOY_PATH/"
    
    echo -e "${GREEN}[Frontend] 前端部署與備份完成！${NC}"
}

# ==========================================
# 部署後端函式
# ==========================================
deploy_backend() {
    echo -e "\n${YELLOW}[Backend] 開始處理後端...${NC}"
    cd backend
    echo "安裝後端依賴..."
    if [ "$PKG_MANAGER" = "pnpm" ]; then
        pnpm install --prod=false # 必須安裝 devDependencies 才能編譯 TypeScript
    else
        npm install --production=false
    fi
    echo "編譯後端程式碼..."
    $PKG_BUILD
    
    echo -e "\n${YELLOW}[Backend] 準備備份後端資料...${NC}"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="${FRONTEND_BACKUP_PATH}/backend_data_${TIMESTAMP}"
    
    if [ -d "data" ]; then
        echo "正在備份後端資料 (SQLite & JSON) 至 $BACKUP_DIR ..."
        mkdir -p "$BACKUP_DIR"
        cp -a data/. "$BACKUP_DIR/"
        echo "後端資料備份完成。"
    else
        echo "未偵測到 data 資料夾，跳過備份。"
    fi

    echo -e "\n${YELLOW}[Backend] 準備啟動後端服務...${NC}"
    # 檢查是否已安裝 PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}未偵測到 PM2，正在全域安裝 PM2...${NC}"
        npm install -g pm2
    fi

    # 檢查是否已經有同名的 PM2 服務在運行
    if pm2 status | grep -q "ztmy-gallery-api"; then
        echo "重啟現有的 PM2 服務..."
        pm2 restart ztmy-gallery-api
    else
        echo "建立新的 PM2 服務..."
        if [ "$PKG_MANAGER" = "pnpm" ]; then
            pm2 start pnpm --name "ztmy-gallery-api" -- start
        else
            pm2 start npm --name "ztmy-gallery-api" -- start
        fi
        echo "儲存 PM2 設定..."
        pm2 save
    fi
    
    echo -e "\n${YELLOW}[Backend] 正在進行服務健康檢查...${NC}"
    
    # 嘗試從 backend/.env 讀取 PORT，預設為 5010
    BACKEND_PORT=$(grep -E "^PORT=" .env | cut -d '=' -f2)
    BACKEND_PORT=${BACKEND_PORT:-5010}
    
    # 最多嘗試 10 次，每次間隔 2 秒
    MAX_RETRIES=10
    RETRY_COUNT=0
    HEALTH_CHECK_PASSED=false
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        echo -e "等待服務啟動... (嘗試 $((RETRY_COUNT + 1))/$MAX_RETRIES)"
        sleep 2
        
        # 呼叫 /health 端點並取得 HTTP 狀態碼
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${BACKEND_PORT}/health || echo "FAILED")
        
        if [ "$HTTP_STATUS" == "200" ]; then
            HEALTH_CHECK_PASSED=true
            break
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
    done
    
    if [ "$HEALTH_CHECK_PASSED" = true ]; then
        echo -e "${GREEN}✓ 服務健康檢查通過！後端已成功運行於 Port ${BACKEND_PORT}。${NC}"
    else
        echo -e "${RED}✗ 服務健康檢查失敗！無法連線到 http://localhost:${BACKEND_PORT}/health${NC}"
        echo -e "${YELLOW}請使用 'pm2 logs ztmy-gallery-api' 指令查看詳細的錯誤日誌。${NC}"
        # 這裡不 exit 1，因為雖然檢查失敗，但部署流程已經走完了，留給使用者自己查錯
    fi

    cd ..
    echo -e "${GREEN}[Backend] 後端部署完成！${NC}"
}

# ==========================================
# 執行選擇的任務
# ==========================================
case $choice in
    1)
        deploy_frontend
        deploy_backend
        ;;
    2)
        deploy_frontend
        ;;
    3)
        deploy_backend
        ;;
esac

# ==========================================
# 結束提示
# ==========================================
echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN}所有選定的部署任務已順利完成！🎉${NC}"
echo -e "${GREEN}==========================================${NC}"
