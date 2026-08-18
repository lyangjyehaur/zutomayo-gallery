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
require_cmd split
require_cmd shasum

upload_file() {
    local local_path="$1"
    local remote_path="$2"

    if scp "${SCP_ARGS[@]}" "${local_path}" "${SERVER_DEST}:${remote_path}"; then
        return 0
    fi

    echo -e "${YELLOW}SCP 中斷，改用可重試的分塊 SSH 上傳...${NC}"
    local chunk_dir
    local local_checksum
    local remote_checksum
    local chunk_count=0
    local chunk_total=0
    chunk_dir="$(mktemp -d)"
    split -b "${UPLOAD_CHUNK_SIZE:-180k}" -d -a 4 "${local_path}" "${chunk_dir}/part."
    ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" \
        "rm -f '${remote_path}.uploading' '${remote_path}.upload.part.'*"

    for _ in "${chunk_dir}"/part.*; do
        chunk_total=$((chunk_total + 1))
    done

    for chunk_path in "${chunk_dir}"/part.*; do
        local chunk_name
        local chunk_checksum
        local remote_chunk
        local remote_chunk_checksum
        local uploaded=false
        chunk_name="$(basename "${chunk_path}")"
        chunk_checksum="$(shasum -a 256 "${chunk_path}" | awk '{print $1}')"
        remote_chunk="${remote_path}.upload.${chunk_name}"

        for attempt in $(seq 1 "${UPLOAD_RETRIES:-5}"); do
            if ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" \
                "dd of='${remote_chunk}' status=none" < "${chunk_path}"; then
                :
            fi
            remote_chunk_checksum="$(ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" \
                "sha256sum '${remote_chunk}' 2>/dev/null" 2>/dev/null || true)"
            remote_chunk_checksum="${remote_chunk_checksum%% *}"
            if [ "${chunk_checksum}" = "${remote_chunk_checksum}" ]; then
                uploaded=true
                break
            fi
        done

        if ! ${uploaded}; then
            echo -e "${RED}錯誤：分塊 ${chunk_name} 上傳 ${UPLOAD_RETRIES:-5} 次後仍校驗失敗。${NC}"
            find "${chunk_dir}" -type f -delete
            rmdir "${chunk_dir}"
            return 1
        fi

        chunk_count=$((chunk_count + 1))
        if [ $((chunk_count % 10)) -eq 0 ] || [ "${chunk_count}" -eq "${chunk_total}" ]; then
            echo -e "${YELLOW}分塊上傳進度：${chunk_count}/${chunk_total}${NC}"
        fi
    done

    local_checksum="$(shasum -a 256 "${local_path}" | awk '{print $1}')"
    remote_checksum="$(ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" \
        "set -e; assembled='${remote_path}.uploading'; truncate -s 0 \"\${assembled}\"; for chunk in '${remote_path}.upload.part.'*; do cat \"\${chunk}\" >> \"\${assembled}\"; done; sha256sum \"\${assembled}\"")"
    remote_checksum="${remote_checksum%% *}"
    find "${chunk_dir}" -type f -delete
    rmdir "${chunk_dir}"

    if [ "${local_checksum}" != "${remote_checksum}" ]; then
        echo -e "${RED}錯誤：分塊上傳 checksum 不一致。${NC}"
        return 1
    fi

    ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" \
        "mv '${remote_path}.uploading' '${remote_path}' && rm -f '${remote_path}.upload.part.'*"
}

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

# 所有伺服器與容器參數都由 deploy-local.conf 提供
SERVER_DEST="${SSH_TARGET:-${SERVER_USER:-}@${SERVER_IP:-}}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-15}"
SSH_KEEPALIVE_INTERVAL="${SSH_KEEPALIVE_INTERVAL:-10}"
SSH_KEEPALIVE_COUNT_MAX="${SSH_KEEPALIVE_COUNT_MAX:-3}"
SSH_CONNECTION_ATTEMPTS="${SSH_CONNECTION_ATTEMPTS:-3}"
SSH_COMMON_ARGS=(
    -o "BatchMode=yes"
    -o "ConnectTimeout=${SSH_CONNECT_TIMEOUT}"
    -o "ConnectionAttempts=${SSH_CONNECTION_ATTEMPTS}"
    -o "ServerAliveInterval=${SSH_KEEPALIVE_INTERVAL}"
    -o "ServerAliveCountMax=${SSH_KEEPALIVE_COUNT_MAX}"
    -o "TCPKeepAlive=yes"
)
SSH_ARGS=("${SSH_COMMON_ARGS[@]}")
SCP_ARGS=("${SSH_COMMON_ARGS[@]}")
if [ -n "${SERVER_PORT:-}" ]; then
    SSH_ARGS+=(-p "${SERVER_PORT}")
    SCP_ARGS+=(-P "${SERVER_PORT}")
fi
REMOTE_WWW_DIR="${REMOTE_DEPLOY_PATH:-}"
REMOTE_REVIEW_DIR="${REMOTE_REVIEW_DEPLOY_PATH:-}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_PATH:-}"

required_settings=(
    SERVER_DEST REMOTE_WWW_DIR REMOTE_REVIEW_DIR REMOTE_PROJECT_DIR
    BACKEND_CONTAINER_NAME DOCKER_NETWORK NODE_IMAGE BACKEND_HEALTH_ORIGIN
    BACKEND_PORT BACKEND_RESTART_POLICY
)
for setting_name in "${required_settings[@]}"; do
    if [ -z "${!setting_name:-}" ]; then
        echo -e "${RED}錯誤：deploy-local.conf 缺少必要設定 ${setting_name}。${NC}"
        exit 1
    fi
done
if [ -z "${SSH_TARGET:-}" ] && { [ -z "${SERVER_USER:-}" ] || [ -z "${SERVER_IP:-}" ]; }; then
    echo -e "${RED}錯誤：deploy-local.conf 需設定 SSH_TARGET，或同時設定 SERVER_USER 與 SERVER_IP。${NC}"
    exit 1
fi


# 顯示選單
# 支援非互動模式：--all / --frontend / --backend / --review（可組合）與 --status
# Deploy tag 只會在明確傳入 --tag 時建立並 push。
do_frontend=false
do_backend=false
do_review=false
do_status=false
do_tag=false
for arg in "$@"; do
  case "$arg" in
    --all) do_frontend=true; do_backend=true; do_review=true ;;
    --frontend) do_frontend=true ;;
    --backend) do_backend=true ;;
    --review) do_review=true ;;
    --status) do_status=true ;;
    --tag) do_tag=true ;;
    *) echo -e "${RED}無效參數：${arg}${NC}"; exit 1 ;;
  esac
done

if ! $do_frontend && ! $do_backend && ! $do_review && ! $do_status; then
  echo -e "${GREEN}==========================================${NC}"
  echo -e "${GREEN} ZUTOMAYO MV Gallery 部署工具${NC}"
  echo -e "${GREEN}==========================================${NC}"
  echo "1) 部署前端 (本地編譯並上傳)"
  echo "2) 部署後端 (遠端拉取並重啟)"
  echo "3) 部署全部 (前端 + Review App + 後端)"
  echo "4) 部署 Review App (本地編譯並上傳)"
  echo "5) 檢查遠端後端狀態"
  echo "0) 退出"
  echo -n "請選擇部署項目 [1-5, 預設 3]: "
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
    5) do_status=true ;;
    *) echo -e "${RED}無效選項：$choice${NC}"; exit 1 ;;
  esac
fi

if $do_status; then
    echo -e "${GREEN}=== 後端容器狀態 ===${NC}"
    ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" bash -s -- \
        "${BACKEND_CONTAINER_NAME}" "${BACKEND_HEALTH_ORIGIN}" <<'ENDSSH'
CONTAINER_NAME="$1"
HEALTH_ORIGIN="$2"

docker ps --filter "name=^/${CONTAINER_NAME}$" \
    --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

if ! docker inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
    echo "Container not found: ${CONTAINER_NAME}" >&2
    exit 1
fi

HEALTH_BODY="$(mktemp)"
trap 'rm -f "${HEALTH_BODY}"' EXIT
HTTP_STATUS="$(curl -sS -o "${HEALTH_BODY}" -w '%{http_code}' "${HEALTH_ORIGIN}/health" || true)"
HEALTH_FAILED=false
if [ "${HTTP_STATUS}" = "200" ]; then
    echo "Health check: OK (${HEALTH_ORIGIN}/health)"
    cat "${HEALTH_BODY}"
    echo
else
    echo "Health check: FAILED (HTTP ${HTTP_STATUS:-unknown})"
    HEALTH_FAILED=true
fi

echo '--- Recent logs ---'
docker logs --tail 15 "${CONTAINER_NAME}" 2>&1

if ${HEALTH_FAILED}; then
    exit 1
fi
ENDSSH
    exit 0
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
        npm install
        npm run build
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

    # 使用 scp 將新打包的 dist 目錄內容上傳
    echo -e "${YELLOW}正在壓縮前端檔案 (dist.tar.gz)...${NC}"
    # 加入 --no-xattrs 等參數避免 macOS 產生 LIBARCHIVE extended header 警告
    export COPYFILE_DISABLE=1
    cd "${SCRIPT_DIR}/frontend/dist" && tar --disable-copyfile --no-mac-metadata --no-xattrs -czf ../dist.tar.gz ./* && cd "${SCRIPT_DIR}"
    
    echo -e "${YELLOW}正在上傳壓縮檔至伺服器...${NC}"
    # 將 SCP 目標改為暫存目錄，因為 SCP 不支援自訂 ssh port 時跟隨 SSH 變數裡的參數
    upload_file "${SCRIPT_DIR}/frontend/dist.tar.gz" "/tmp/dist.tar.gz"
    
    echo -e "${YELLOW}正在伺服器端解壓縮檔案...${NC}"
    ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" "sudo tar -tzf /tmp/dist.tar.gz >/dev/null && sudo mkdir -p '${REMOTE_WWW_DIR}' && sudo tar -xzf /tmp/dist.tar.gz -C '${REMOTE_WWW_DIR}'"
    
    # 清理本地壓縮檔
    rm "${SCRIPT_DIR}/frontend/dist.tar.gz"
    
    # 僅對目錄和靜態資源設定正確權限
    echo -e "${YELLOW}正在設定檔案權限 (目錄 755, 檔案 644)...${NC}"
    ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" "sudo find '${REMOTE_WWW_DIR}' -type d -exec chmod 755 {} \; && sudo find '${REMOTE_WWW_DIR}' -type f -exec chmod 644 {} \;"
    
    echo -e "${GREEN}前端檔案上傳成功並已設定權限！${NC}"
    if $do_tag; then
        tag_frontend_deploy
    else
        echo -e "${YELLOW}未傳入 --tag，略過 Deploy tag 與 push。${NC}"
    fi
fi

# Review App 上傳邏輯
if $do_review; then

    echo -e "\n${GREEN}==========================================${NC}"
    echo -e "${GREEN} 正在上傳 Review App 靜態檔案至伺服器...${NC}"
    echo -e "${GREEN}==========================================${NC}"

    echo -e "${YELLOW}正在壓縮 Review App 檔案 (dist.tar.gz)...${NC}"
    export COPYFILE_DISABLE=1
    cd "${SCRIPT_DIR}/review-app/dist" && tar --disable-copyfile --no-mac-metadata --no-xattrs -czf ../dist.tar.gz ./* && cd "${SCRIPT_DIR}"

    echo -e "${YELLOW}正在上傳壓縮檔至伺服器...${NC}"
    upload_file "${SCRIPT_DIR}/review-app/dist.tar.gz" "/tmp/review_dist.tar.gz"

    echo -e "${YELLOW}正在伺服器端解壓縮檔案...${NC}"
    ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" "sudo tar -tzf /tmp/review_dist.tar.gz >/dev/null && sudo mkdir -p '${REMOTE_REVIEW_DIR}' && sudo tar -xzf /tmp/review_dist.tar.gz -C '${REMOTE_REVIEW_DIR}'"

    rm "${SCRIPT_DIR}/review-app/dist.tar.gz"

    echo -e "${YELLOW}正在設定檔案權限 (目錄 755, 檔案 644)...${NC}"
    ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" "sudo find '${REMOTE_REVIEW_DIR}' -type d -exec chmod 755 {} \; && sudo find '${REMOTE_REVIEW_DIR}' -type f -exec chmod 644 {} \;"

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
    upload_file "${SCRIPT_DIR}/backend/dist.tar.gz" "/tmp/backend_dist.tar.gz"
    
    echo -e "${YELLOW}遠端執行部署指令...${NC}"
    ssh "${SSH_ARGS[@]}" "${SERVER_DEST}" bash -s -- \
        "${REMOTE_PROJECT_DIR}" "${BACKEND_CONTAINER_NAME}" "${DOCKER_NETWORK}" \
        "${NODE_IMAGE}" "${BACKEND_HEALTH_ORIGIN}" "${BACKEND_PORT}" \
        "${BACKEND_RESTART_POLICY}" <<'ENDSSH'
    PROJECT_DIR="$1"
    CONTAINER_NAME="$2"
    NETWORK_NAME="$3"
    NODE_IMAGE="$4"
    HEALTH_ORIGIN="$5"
    BACKEND_PORT="$6"
    RESTART_POLICY="$7"

    sudo tar -xzf /tmp/backend_dist.tar.gz -C "${PROJECT_DIR}/backend/"
    sudo rm /tmp/backend_dist.tar.gz
    echo '>> 正在安裝後端套件 (這可能需要幾分鐘)...'
    sudo docker run --rm \
        -v "${PROJECT_DIR}/backend:/app" -w /app \
        "${NODE_IMAGE}" npm install --omit=dev

    sudo docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
    sudo docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true
    echo '>> 正在啟動後端服務...'
    sudo docker run -d \
        --name "${CONTAINER_NAME}" \
        --restart "${RESTART_POLICY}" \
        --network "${NETWORK_NAME}" \
        -p "${BACKEND_PORT}:${BACKEND_PORT}" \
        -v "${PROJECT_DIR}/backend:/app" -w /app \
        "${NODE_IMAGE}" npm start

    echo '>> 正在等待後端健康檢查...'
    for attempt in $(seq 1 15); do
        status="$(curl -sS -o /dev/null -w '%{http_code}' "${HEALTH_ORIGIN}/health" || true)"
        if [ "${status}" = "200" ]; then
            echo ">> 後端健康檢查通過 (${HEALTH_ORIGIN}/health)"
            exit 0
        fi
        sleep 2
    done

    echo ">> 後端健康檢查失敗，最後 HTTP 狀態：${status:-unknown}" >&2
    sudo docker logs --tail 50 "${CONTAINER_NAME}" >&2 || true
    exit 1
ENDSSH
    
    rm "${SCRIPT_DIR}/backend/dist.tar.gz"
    echo -e "${GREEN}後端服務更新完成！${NC}"
fi

echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN} 部署流程結束！🎉${NC}"
echo -e "${GREEN}==========================================${NC}"
