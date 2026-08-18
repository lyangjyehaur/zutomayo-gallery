#!/bin/bash

# ==========================================
# ZUTOMAYO Gallery - 伺服器部署與啟動腳本
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

PKG_INSTALL="npm install"
PKG_BUILD="npm run build"
echo -e "${GREEN}使用 npm 進行套件管理。${NC}"
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
FRONTEND_DEPLOY_PATH=""

# 前端備份目錄 (每次更新前會將舊檔案備份到這裡)
FRONTEND_BACKUP_PATH="/www/wwwroot/mv_backup"

# Review App 部署目標路徑
REVIEW_APP_DEPLOY_PATH=""

# 後端 health check origin（例如 http://localhost:5010）
BACKEND_HEALTH_ORIGIN=""

# 後端 Docker 服務設定
BACKEND_CONTAINER_NAME=""
DOCKER_NETWORK=""
NODE_IMAGE=""
BACKEND_PORT=""
BACKEND_RESTART_POLICY="unless-stopped"

EOF
    echo -e "${RED}已建立預設 $CONFIG_FILE！${NC}"
    echo -e "${RED}請先編輯 $CONFIG_FILE 確認路徑是否正確，然後再次執行此腳本。${NC}"
    exit 1
fi

# 讀取設定檔變數
source "$CONFIG_FILE"

require_deploy_setting() {
    local setting_name="$1"
    if [ -z "${!setting_name:-}" ]; then
        echo -e "${RED}錯誤：${CONFIG_FILE} 缺少必要設定 ${setting_name}。${NC}"
        exit 1
    fi
}

# ==========================================
# 2. 互動式選單
# ==========================================
echo -e "${GREEN}歡迎使用 ZUTOMAYO Gallery 部署工具${NC}"
echo "請選擇要執行的操作："
echo "1) 部署全部 (前端 + 後端 + Review App)"
echo "2) 僅部署前端 (Frontend)"
echo "3) 僅部署後端 (Backend)"
echo "4) 僅部署 Review App"
echo "5) 檢查服務狀態 (Health Check & Logs)"
echo "0) 退出"
read -p "請輸入選項 [1/2/3/4/5/0]: " choice

if [ "$choice" == "0" ]; then
    echo "已退出部署。"
    exit 0
fi

if [[ "$choice" != "1" && "$choice" != "2" && "$choice" != "3" && "$choice" != "4" && "$choice" != "5" ]]; then
    echo -e "${RED}無效的選項！請重新執行腳本。${NC}"
    exit 1
fi

case "$choice" in
    1)
        required_settings=(
            FRONTEND_DEPLOY_PATH FRONTEND_BACKUP_PATH REVIEW_APP_DEPLOY_PATH
            BACKEND_HEALTH_ORIGIN BACKEND_CONTAINER_NAME DOCKER_NETWORK NODE_IMAGE
            BACKEND_PORT BACKEND_RESTART_POLICY
        )
        ;;
    2)
        required_settings=(FRONTEND_DEPLOY_PATH FRONTEND_BACKUP_PATH)
        ;;
    3)
        required_settings=(
            FRONTEND_BACKUP_PATH BACKEND_HEALTH_ORIGIN BACKEND_CONTAINER_NAME
            DOCKER_NETWORK NODE_IMAGE BACKEND_PORT BACKEND_RESTART_POLICY
        )
        ;;
    4)
        required_settings=(REVIEW_APP_DEPLOY_PATH FRONTEND_BACKUP_PATH)
        ;;
    5)
        required_settings=(BACKEND_HEALTH_ORIGIN BACKEND_CONTAINER_NAME BACKEND_PORT)
        ;;
esac
for setting_name in "${required_settings[@]}"; do
    require_deploy_setting "$setting_name"
done

# 如果選擇檢查服務狀態，直接執行並退出
if [ "$choice" == "5" ]; then
    echo -e "\n${YELLOW}=== 服務狀態檢查 ===${NC}"
    
    echo -e "\n[Docker 容器狀態]"
    docker ps --filter "name=^/${BACKEND_CONTAINER_NAME}$" \
        --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

    echo -e "\n[API 健康檢查]"
    HEALTH_ORIGIN="${BACKEND_HEALTH_ORIGIN}"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_ORIGIN}/health" || echo "FAILED")
    if [ "$HTTP_STATUS" == "200" ]; then
        echo -e "${GREEN}✓ 服務運作正常 (Port: ${BACKEND_PORT})${NC}"
        # 抓取詳細狀態資訊
        HEALTH_INFO=$(curl -s "${HEALTH_ORIGIN}/health")
        echo -e "詳細資訊: ${HEALTH_INFO}"
    else
        echo -e "${RED}✗ 服務無回應或已停止 (HTTP Status: $HTTP_STATUS)${NC}"
    fi
    
    echo -e "\n[最近 15 行日誌]"
    docker logs --tail 15 "${BACKEND_CONTAINER_NAME}" 2>&1 || echo -e "${YELLOW}無法獲取日誌。${NC}"
    
    echo -e "\n${GREEN}==========================================${NC}"
    exit 0
fi

# ==========================================
# 3. 獲取最新程式碼 (Skip since we are local)
# ==========================================
# echo -e "\n${YELLOW}[Git] 正在拉取最新程式碼...${NC}"

# # 如果有未提交的變更 (如 package-lock.json)，嘗試捨棄它們
# if ! git diff-index --quiet HEAD --; then
#     echo -e "${YELLOW}偵測到伺服器上有本地變更，正在還原至線上最新版本...${NC}"
#     git reset --hard HEAD
#     git clean -fd
# fi

# git pull origin main || {
#     echo -e "${RED}拉取程式碼失敗，請確認 Git 狀態或是否有衝突！${NC}"
#     exit 1
# }

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
}

validate_backend_env() {
    if [ ! -f "backend/.env" ]; then
        return
    fi

    # 僅在 production 情境下阻擋缺少必要秘密的部署
    BACKEND_NODE_ENV=$(grep -E "^NODE_ENV=" backend/.env 2>/dev/null | tail -n1 | cut -d '=' -f2- | tr -d '\r' | xargs)
    BACKEND_SESSION_SECRET=$(grep -E "^SESSION_SECRET=" backend/.env 2>/dev/null | tail -n1 | cut -d '=' -f2- | tr -d '\r' | xargs)

    if [ "$BACKEND_NODE_ENV" = "production" ] && [ -z "$BACKEND_SESSION_SECRET" ]; then
        echo -e "${RED}錯誤：backend/.env 目前是 production，但 SESSION_SECRET 為空。${NC}"
        echo -e "${YELLOW}請先在 backend/.env 設定一個足夠隨機的 SESSION_SECRET，再重新執行部署。${NC}"
        echo -e "${YELLOW}你可以參考 backend/.env.example 的欄位說明。${NC}"
        exit 1
    fi
}

if [[ "$choice" == "1" || "$choice" == "2" ]]; then
    check_and_edit_env "frontend/.env" "前端 (Frontend)"
fi

if [[ "$choice" == "1" || "$choice" == "3" ]]; then
    check_and_edit_env "backend/.env" "後端 (Backend)"
    validate_backend_env
fi

if [[ "$choice" == "1" || "$choice" == "4" ]]; then
    check_and_edit_env "review-app/.env" "Review App"
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

    find "$FRONTEND_DEPLOY_PATH" -type d -exec chmod 755 {} \;
    find "$FRONTEND_DEPLOY_PATH" -type f -exec chmod 644 {} \;
    
    echo -e "${GREEN}[Frontend] 前端部署與備份完成！${NC}"
}

# ==========================================
# 部署後端函式
# ==========================================
deploy_backend() {
    echo -e "\n${YELLOW}[Backend] 開始處理後端...${NC}"
    local project_root
    project_root="$(pwd)"

    echo "在容器環境安裝後端 production 依賴..."
    docker run --rm \
        -v "${project_root}/backend:/app" \
        -w /app \
        "${NODE_IMAGE}" \
        npm install --omit=dev

    echo -e "${GREEN}使用已上傳的編譯產物，跳過伺服器端 tsc 編譯。${NC}"
    
    echo -e "\n${YELLOW}[Backend] 準備備份後端資料...${NC}"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="${FRONTEND_BACKUP_PATH}/backend_data_${TIMESTAMP}"
    
    if [ -d "backend/data" ]; then
        echo "正在備份後端資料 (SQLite & JSON) 至 $BACKUP_DIR ..."
        mkdir -p "$BACKUP_DIR"
        cp -a backend/data/. "$BACKUP_DIR/"
        echo "後端資料備份完成。"
    else
        echo "未偵測到 data 資料夾，跳過備份。"
    fi

    echo -e "\n${YELLOW}[Backend] 準備啟動後端服務...${NC}"
    docker stop "${BACKEND_CONTAINER_NAME}" >/dev/null 2>&1 || true
    docker rm "${BACKEND_CONTAINER_NAME}" >/dev/null 2>&1 || true
    docker run -d \
        --name "${BACKEND_CONTAINER_NAME}" \
        --restart "${BACKEND_RESTART_POLICY}" \
        --network "${DOCKER_NETWORK}" \
        -p "${BACKEND_PORT}:${BACKEND_PORT}" \
        -v "${project_root}/backend:/app" \
        -w /app \
        "${NODE_IMAGE}" \
        npm start
    
    echo -e "\n${YELLOW}[Backend] 正在進行服務健康檢查...${NC}"
    
    # 最多嘗試 10 次，每次間隔 2 秒
    MAX_RETRIES=10
    RETRY_COUNT=0
    HEALTH_CHECK_PASSED=false
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        echo -e "等待服務啟動... (嘗試 $((RETRY_COUNT + 1))/$MAX_RETRIES)"
        sleep 2
        
        # 呼叫 /health 端點並取得 HTTP 狀態碼
        HEALTH_ORIGIN="${BACKEND_HEALTH_ORIGIN}"
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_ORIGIN}/health" || echo "FAILED")
        
        if [ "$HTTP_STATUS" == "200" ]; then
            HEALTH_CHECK_PASSED=true
            break
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
    done
    
    if [ "$HEALTH_CHECK_PASSED" = true ]; then
        echo -e "${GREEN}✓ 服務健康檢查通過！後端已成功運行於 Port ${BACKEND_PORT}。${NC}"
    else
        echo -e "${RED}✗ 服務健康檢查失敗！無法連線到 ${HEALTH_ORIGIN}/health${NC}"
        echo -e "${YELLOW}請使用 'docker logs ${BACKEND_CONTAINER_NAME}' 指令查看詳細的錯誤日誌。${NC}"
        docker logs --tail 50 "${BACKEND_CONTAINER_NAME}" >&2 || true
        exit 1
    fi

    echo -e "${GREEN}[Backend] 後端部署完成！${NC}"
}

# ==========================================
# 部署 Review App 函式
# ==========================================
deploy_review_app() {
    echo -e "\n${YELLOW}[Review App] 開始處理 Review App...${NC}"
    cd review-app
    echo "安裝 Review App 依賴..."
    $PKG_INSTALL
    echo "編譯 Review App 靜態檔案..."
    $PKG_BUILD
    cd ..

    echo -e "\n${YELLOW}[Review App] 準備備份與發佈 Review App 檔案...${NC}"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="${FRONTEND_BACKUP_PATH}/review_app_${TIMESTAMP}"

    if [ ! -d "$REVIEW_APP_DEPLOY_PATH" ]; then
        echo -e "${YELLOW}建立部署目錄: $REVIEW_APP_DEPLOY_PATH${NC}"
        mkdir -p "$REVIEW_APP_DEPLOY_PATH" || {
            echo -e "${RED}錯誤: 無法建立部署目錄 $REVIEW_APP_DEPLOY_PATH，請檢查權限！${NC}"
            exit 1
        }
    fi
    if [ ! -w "$REVIEW_APP_DEPLOY_PATH" ]; then
        echo -e "${RED}錯誤: 對部署目錄 $REVIEW_APP_DEPLOY_PATH 沒有寫入權限！請使用 sudo 執行或更改權限。${NC}"
        exit 1
    fi
    mkdir -p "$BACKUP_DIR" || {
        echo -e "${RED}錯誤: 無法建立備份目錄 $BACKUP_DIR，請檢查權限！${NC}"
        exit 1
    }

    if [ "$(ls -A $REVIEW_APP_DEPLOY_PATH)" ]; then
        echo "正在備份當前線上檔案至 $BACKUP_DIR ..."
        cp -a "$REVIEW_APP_DEPLOY_PATH/." "$BACKUP_DIR/"

        echo "清理舊版線上檔案..."
        rm -rf "${REVIEW_APP_DEPLOY_PATH:?}/"*
    else
        echo "部署目錄為空，跳過備份步驟。"
    fi

    echo "正在將新編譯的檔案複製到部署目錄 $REVIEW_APP_DEPLOY_PATH ..."
    cp -a review-app/dist/. "$REVIEW_APP_DEPLOY_PATH/"

    find "$REVIEW_APP_DEPLOY_PATH" -type d -exec chmod 755 {} \;
    find "$REVIEW_APP_DEPLOY_PATH" -type f -exec chmod 644 {} \;

    echo -e "${GREEN}[Review App] Review App 部署與備份完成！${NC}"
}

# ==========================================
# 執行選擇的任務
# ==========================================
case $choice in
    1)
        deploy_frontend
        deploy_review_app
        deploy_backend
        ;;
    2)
        deploy_frontend
        ;;
    3)
        deploy_backend
        ;;
    4)
        deploy_review_app
        ;;
esac

# ==========================================
# 結束提示
# ==========================================
echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN}所有選定的部署任務已順利完成！🎉${NC}"
echo -e "${GREEN}==========================================${NC}"
