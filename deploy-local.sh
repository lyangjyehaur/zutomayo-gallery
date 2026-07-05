#!/bin/bash
# ==========================================
# ZUTOMAYO MV Gallery - 本地打包與遠端發佈腳本
# 解決伺服器記憶體不足無法編譯前端的問題
# ==========================================

# 確保腳本在錯誤時停止執行
set -e
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 伺服器設定 (請確定這些設定與 deploy-local.conf 一致)
source "${SCRIPT_DIR}/deploy-local.conf"

require_cmd() {
    local cmd_name="$1"
    if ! command -v "$cmd_name" &> /dev/null; then
        echo -e "${RED}錯誤：缺少必要指令 ${cmd_name}，請先安裝後再執行。${NC}"
        exit 1
    fi
}

require_cmd ssh
require_cmd scp
require_cmd tar
require_cmd npm
require_cmd git

tag_frontend_deploy() {
    local version
    local hash
    local tag_name

    version=$(node -p "require('./package.json').version")
    hash=$(git rev-parse --short HEAD)
    tag_name="deploy-v${version}-${hash}"

    if git rev-parse -q --verify "refs/tags/${tag_name}" >/dev/null; then
        echo -e "${YELLOW}Deploy tag 已存在：${tag_name}${NC}"
    else
        git tag -a "${tag_name}" -m "Deploy frontend v${version}"
        echo -e "${GREEN}已建立 Deploy tag：${tag_name}${NC}"
    fi

    if git remote get-url origin >/dev/null 2>&1; then
        git push origin "${tag_name}"
    else
        echo -e "${YELLOW}未找到 git remote origin，略過推送 deploy tag。${NC}"
    fi
}

# 如果 conf 內有定義，覆蓋預設值
if [ ! -z "$SERVER_IP" ]; then
    if [ ! -z "$SERVER_PORT" ]; then
        SERVER="-p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP}"
    else
        SERVER="${SERVER_USER}@${SERVER_IP}"
    fi
fi
if [ ! -z "$REMOTE_DEPLOY_PATH" ]; then
    REMOTE_WWW_DIR="${REMOTE_DEPLOY_PATH}"
fi
REMOTE_REVIEW_DIR="${REMOTE_REVIEW_DEPLOY_PATH:-/www/wwwroot/review.ztmr.club}"
REMOTE_PROJECT_DIR="/opt/projects/zutomayo-gallery"

if [ -z "${SERVER_USER:-}" ] || [ -z "${SERVER_IP:-}" ] || [ -z "${REMOTE_WWW_DIR:-}" ]; then
    echo -e "${RED}錯誤：deploy-local.conf 缺少必要設定，請確認 SERVER_USER、SERVER_IP 與 REMOTE_DEPLOY_PATH。${NC}"
    exit 1
fi


# 顯示選單
# 支援非互動模式：--all / --frontend / --backend / --review（可組合）
do_frontend=false
do_backend=false
do_review=false
for arg in "$@"; do
  case "$arg" in
    --all) do_frontend=true; do_backend=true; do_review=true ;;
    --frontend) do_frontend=true ;;
    --backend) do_backend=true ;;
    --review) do_review=true ;;
  esac
done

if ! $do_frontend && ! $do_backend && ! $do_review; then
  echo -e "${GREEN}==========================================${NC}"
  echo -e "${GREEN} ZUTOMAYO MV Gallery 部署工具${NC}"
  echo -e "${GREEN}==========================================${NC}"
  echo "1) 部署前端 (本地編譯並上傳)"
  echo "2) 部署後端 (遠端拉取並重啟)"
  echo "3) 部署全部 (前端 + Review App + 後端)"
  echo "4) 部署 Review App (本地編譯並上傳)"
  echo "0) 退出"
  echo -n "請選擇部署項目 [1-4, 預設 3]: "
  read choice

  if [ -z "$choice" ]; then
    choice=3
  fi

  if [ "$choice" == "0" ]; then
    echo -e "${YELLOW}部署已取消。${NC}"
    exit 0
  fi

  case "$choice" in
    1) do_frontend=true ;;
    2) do_backend=true ;;
    3) do_frontend=true; do_backend=true; do_review=true ;;
    4) do_review=true ;;
    *) echo -e "${RED}無效選項：$choice${NC}"; exit 1 ;;
  esac
fi

# 前端與後端編譯邏輯 (在本地 Mac 執行)
if $do_frontend || $do_backend || $do_review; then
    echo -e "\n${GREEN}==========================================${NC}"
    echo -e "${GREEN} 開始在本地打包編譯 (Mac/PC)...${NC}"
    echo -e "${GREEN}==========================================${NC}"
    
    if $do_frontend; then
        echo -e "${YELLOW}[Frontend] 正在編譯前端...${NC}"
        cd "${SCRIPT_DIR}/frontend"
        if command -v pnpm &> /dev/null; then
            pnpm install --no-frozen-lockfile && pnpm run build
        else
            npm install && npm run build
        fi
        cd "${SCRIPT_DIR}"
    fi

    if $do_backend; then
        echo -e "${YELLOW}[Backend] 正在編譯後端 TypeScript...${NC}"
        cd "${SCRIPT_DIR}/backend"
        if command -v pnpm &> /dev/null; then
            pnpm install --no-frozen-lockfile && pnpm run build
        else
            npm install && npm run build
        fi
        cd "${SCRIPT_DIR}"
    fi

    if $do_review; then
        echo -e "${YELLOW}[Review App] 正在編譯 Review App...${NC}"
        cd "${SCRIPT_DIR}/review-app"
        npm install && npm run build
        cd "${SCRIPT_DIR}"
    fi
fi

# 前端上傳邏輯
if $do_frontend; then
    echo -e "\n${GREEN}==========================================${NC}"
    echo -e "${GREEN} 正在上傳前端靜態檔案至伺服器...${NC}"
    echo -e "${GREEN}==========================================${NC}"

    # 清空伺服器上的舊靜態檔案
    echo -e "${YELLOW}清空伺服器舊檔案 (${REMOTE_WWW_DIR})...${NC}"
    ssh ${SERVER} "sudo mkdir -p '${REMOTE_WWW_DIR}' && sudo rm -rf '${REMOTE_WWW_DIR}'/*"

    # 使用 scp 將新打包的 dist 目錄內容上傳
    echo -e "${YELLOW}正在壓縮前端檔案 (dist.tar.gz)...${NC}"
    # 加入 --no-xattrs 等參數避免 macOS 產生 LIBARCHIVE extended header 警告
    export COPYFILE_DISABLE=1
    cd "${SCRIPT_DIR}/frontend/dist" && tar --disable-copyfile --no-mac-metadata --no-xattrs -czf ../dist.tar.gz ./* && cd "${SCRIPT_DIR}"
    
    echo -e "${YELLOW}正在上傳壓縮檔至伺服器...${NC}"
    # 將 SCP 目標改為暫存目錄，因為 SCP 不支援自訂 ssh port 時跟隨 SSH 變數裡的參數
    scp -P "${SERVER_PORT:-22}" "${SCRIPT_DIR}/frontend/dist.tar.gz" "${SERVER_USER}@${SERVER_IP}:/tmp/dist.tar.gz"
    
    echo -e "${YELLOW}正在伺服器端解壓縮檔案...${NC}"
    ssh ${SERVER} "sudo mkdir -p '${REMOTE_WWW_DIR}' && sudo cp /tmp/dist.tar.gz '${REMOTE_WWW_DIR}/' && cd '${REMOTE_WWW_DIR}' && sudo tar -xzf dist.tar.gz && sudo rm dist.tar.gz /tmp/dist.tar.gz"
    
    # 清理本地壓縮檔
    rm "${SCRIPT_DIR}/frontend/dist.tar.gz"
    
    # 僅對目錄和靜態資源設定正確權限
    echo -e "${YELLOW}正在設定檔案權限 (目錄 755, 檔案 644)...${NC}"
    ssh ${SERVER} "sudo find '${REMOTE_WWW_DIR}' -type d -exec chmod 755 {} \; && sudo find '${REMOTE_WWW_DIR}' -type f -exec chmod 644 {} \;"
    
    echo -e "${GREEN}前端檔案上傳成功並已設定權限！${NC}"
    tag_frontend_deploy
fi

# Review App 上傳邏輯
if $do_review; then

    echo -e "\n${GREEN}==========================================${NC}"
    echo -e "${GREEN} 正在上傳 Review App 靜態檔案至伺服器...${NC}"
    echo -e "${GREEN}==========================================${NC}"

    echo -e "${YELLOW}清空伺服器舊檔案 (${REMOTE_REVIEW_DIR})...${NC}"
    ssh ${SERVER} "sudo mkdir -p '${REMOTE_REVIEW_DIR}' && sudo rm -rf '${REMOTE_REVIEW_DIR}'/*"

    echo -e "${YELLOW}正在壓縮 Review App 檔案 (dist.tar.gz)...${NC}"
    export COPYFILE_DISABLE=1
    cd "${SCRIPT_DIR}/review-app/dist" && tar --disable-copyfile --no-mac-metadata --no-xattrs -czf ../dist.tar.gz ./* && cd "${SCRIPT_DIR}"

    echo -e "${YELLOW}正在上傳壓縮檔至伺服器...${NC}"
    scp -P "${SERVER_PORT:-22}" "${SCRIPT_DIR}/review-app/dist.tar.gz" "${SERVER_USER}@${SERVER_IP}:/tmp/review_dist.tar.gz"

    echo -e "${YELLOW}正在伺服器端解壓縮檔案...${NC}"
    ssh ${SERVER} "sudo mkdir -p '${REMOTE_REVIEW_DIR}' && sudo cp /tmp/review_dist.tar.gz '${REMOTE_REVIEW_DIR}/' && cd '${REMOTE_REVIEW_DIR}' && sudo tar -xzf review_dist.tar.gz && sudo rm review_dist.tar.gz /tmp/review_dist.tar.gz"

    rm "${SCRIPT_DIR}/review-app/dist.tar.gz"

    echo -e "${YELLOW}正在設定檔案權限 (目錄 755, 檔案 644)...${NC}"
    ssh ${SERVER} "sudo find '${REMOTE_REVIEW_DIR}' -type d -exec chmod 755 {} \; && sudo find '${REMOTE_REVIEW_DIR}' -type f -exec chmod 644 {} \;"

    echo -e "${GREEN}Review App 檔案上傳成功並已設定權限！${NC}"
fi

# 後端部署邏輯
if $do_backend; then
    echo -e "\n${GREEN}==========================================${NC}"
    echo -e "${GREEN} 更新遠端後端服務...${NC}"
    echo -e "${GREEN}==========================================${NC}"
    
    echo -e "${YELLOW}正在壓縮後端編譯產物與依賴設定 (dist.tar.gz)...${NC}"
    export COPYFILE_DISABLE=1
    cd "${SCRIPT_DIR}/backend"
    lockfiles=()
    [ -f package-lock.json ] && lockfiles+=("package-lock.json")
    [ -f pnpm-lock.yaml ] && lockfiles+=("pnpm-lock.yaml")
    tar --disable-copyfile --no-mac-metadata --no-xattrs -czf dist.tar.gz dist/ package.json "${lockfiles[@]}"
    cd "${SCRIPT_DIR}"
    
    echo -e "${YELLOW}正在上傳後端產物至伺服器...${NC}"
    scp -P "${SERVER_PORT:-22}" "${SCRIPT_DIR}/backend/dist.tar.gz" "${SERVER_USER}@${SERVER_IP}:/tmp/backend_dist.tar.gz"
    
    echo -e "${YELLOW}遠端執行部署指令...${NC}"
    ssh ${SERVER} << 'ENDSSH'
    cd /opt/projects/zutomayo-gallery
    sudo git fetch --all && sudo git reset --hard origin/main
    sudo tar -xzf /tmp/backend_dist.tar.gz -C /opt/projects/zutomayo-gallery/backend/
    sudo rm /tmp/backend_dist.tar.gz
    echo '>> 正在安裝後端套件 (這可能需要幾分鐘)...'
    sudo docker run --rm -v /opt/projects/zutomayo-gallery/backend:/app -w /app 1panel/node:22.22.1 npm install --omit=dev
    (sudo docker stop zutomayo-gallery-server 2>/dev/null || true)
    (sudo docker rm zutomayo-gallery-server 2>/dev/null || true)
    echo '>> 正在啟動後端服務...'
    sudo docker run -d --name zutomayo-gallery-server --network 1panel-network -p 5010:5010 \
        -v /opt/projects/zutomayo-gallery/backend:/app -w /app \
        -e DB_HOST=postgresql \
        -e NODE_ENV=production \
        -e ALLOWED_ORIGINS="https://ztmy.art,https://gallery.ztmr.club,https://review.ztmy.art" \
        -e SESSION_SECRET \
        1panel/node:22.22.1 npm start
ENDSSH
    
    rm "${SCRIPT_DIR}/backend/dist.tar.gz"
    echo -e "${GREEN}後端服務更新完成！${NC}"
fi

echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN} 部署流程結束！🎉${NC}"
echo -e "${GREEN}==========================================${NC}"
