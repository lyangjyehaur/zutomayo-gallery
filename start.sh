#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

MIN_NODE_MAJOR=20
MIN_NPM_MAJOR=10
FRONTEND_PORT=5173
REVIEW_APP_PORT=5174
BACKEND_PORT=5010

echo "========================================"
echo "  ZUTOMAYO Gallery 一鍵啟動腳本"
echo "========================================"
echo

echo "正在檢查 Node.js 版本..."
if ! command -v node >/dev/null 2>&1; then
    echo "錯誤: Node.js 未安裝或未加入 PATH"
    echo "請安裝 Node.js 20 LTS (>=20 <26)"
    exit 1
fi
NODE_VERSION_RAW="$(node -v)"
NODE_MAJOR="${NODE_VERSION_RAW#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
echo "目前 Node.js 版本: $NODE_VERSION_RAW"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
    echo "錯誤: 目前 Node.js 版本過舊，需 >= $MIN_NODE_MAJOR"
    exit 1
fi

echo
echo "正在檢查 npm 套件管理器..."
if ! command -v npm >/dev/null 2>&1; then
    echo "錯誤: npm 未正確安裝"
    exit 1
fi
NPM_VERSION_RAW="$(npm -v)"
NPM_MAJOR="${NPM_VERSION_RAW%%.*}"
echo "目前 npm 版本: $NPM_VERSION_RAW"
if [ "$NPM_MAJOR" -lt "$MIN_NPM_MAJOR" ]; then
    echo "錯誤: npm 版本過舊，需 >= $MIN_NPM_MAJOR"
    exit 1
fi

echo
echo "正在檢查依賴是否已安裝..."
npm run preflight
echo "依賴檢查完成！"
echo

# 顯示目前佔用 Port 的進程
function show_processes() {
    echo "========================================"
    echo " 目前運行的服務狀態："
    echo "----------------------------------------"
    echo "前端 (Port ${FRONTEND_PORT}):"
    lsof -i :"${FRONTEND_PORT}" | grep LISTEN || echo "  (無運行中的前端服務)"
    echo "----------------------------------------"
    echo "Review App (Port ${REVIEW_APP_PORT}):"
    lsof -i :"${REVIEW_APP_PORT}" | grep LISTEN || echo "  (無運行中的 Review App 服務)"
    echo "----------------------------------------"
    echo "後端 (Port ${BACKEND_PORT}):"
    lsof -i :"${BACKEND_PORT}" | grep LISTEN || echo "  (無運行中的後端服務)"
    echo "========================================"
    echo
}

# 終止目前佔用 Port 的進程
function kill_processes() {
    echo "正在檢查並停止已運行的服務..."
    local frontend_pids
    local review_app_pids
    local backend_pids
    frontend_pids="$(lsof -t -i :"${FRONTEND_PORT}" || true)"
    review_app_pids="$(lsof -t -i :"${REVIEW_APP_PORT}" || true)"
    backend_pids="$(lsof -t -i :"${BACKEND_PORT}" || true)"
    local stopped=0

    if [ -n "$frontend_pids" ]; then
        echo "停止前端服務 (Port ${FRONTEND_PORT}, PIDs: $(echo "$frontend_pids" | tr '\n' ' '))..."
        echo "$frontend_pids" | xargs kill -TERM 2>/dev/null || true
        stopped=1
    fi

    if [ -n "$review_app_pids" ]; then
        echo "停止 Review App 服務 (Port ${REVIEW_APP_PORT}, PIDs: $(echo "$review_app_pids" | tr '\n' ' '))..."
        echo "$review_app_pids" | xargs kill -TERM 2>/dev/null || true
        stopped=1
    fi

    if [ -n "$backend_pids" ]; then
        echo "停止後端服務 (Port ${BACKEND_PORT}, PIDs: $(echo "$backend_pids" | tr '\n' ' '))..."
        echo "$backend_pids" | xargs kill -TERM 2>/dev/null || true
        stopped=1
    fi

    if [ $stopped -eq 1 ]; then
        sleep 1
        frontend_pids="$(lsof -t -i :"${FRONTEND_PORT}" || true)"
        review_app_pids="$(lsof -t -i :"${REVIEW_APP_PORT}" || true)"
        backend_pids="$(lsof -t -i :"${BACKEND_PORT}" || true)"
        if [ -n "$frontend_pids" ]; then
            echo "前端仍在運行，強制結束..."
            echo "$frontend_pids" | xargs kill -KILL 2>/dev/null || true
        fi
        if [ -n "$review_app_pids" ]; then
            echo "Review App 仍在運行，強制結束..."
            echo "$review_app_pids" | xargs kill -KILL 2>/dev/null || true
        fi
        if [ -n "$backend_pids" ]; then
            echo "後端仍在運行，強制結束..."
            echo "$backend_pids" | xargs kill -KILL 2>/dev/null || true
        fi
    fi

    if [ $stopped -eq 1 ]; then
        echo "✅ 服務清理完成！"
    else
        echo "✅ 目前沒有佔用 Port 的服務。"
    fi
    echo
}

resolve_choice() {
    case "${1:-}" in
        all|dev) echo "1" ;;
        frontend|fe) echo "2" ;;
        review|review-app|ra) echo "3" ;;
        backend|be) echo "4" ;;
        stop) echo "5" ;;
        exit) echo "6" ;;
        1|2|3|4|5|6) echo "$1" ;;
        "") echo "" ;;
        *)
            echo "未知參數: $1"
            echo "可用參數: all|frontend|review|backend|stop|exit"
            exit 1
            ;;
    esac
}

choice="$(resolve_choice "${1:-}")"
if [ -z "$choice" ]; then
    show_processes
    echo "請選擇操作："
    echo "1. 一鍵啟動全部（前端 + Review App + 後端）"
    echo "2. 只啟動前端"
    echo "3. 只啟動 Review App"
    echo "4. 只啟動後端"
    echo "5. 僅停止所有運行中的服務並退出"
    echo "6. 退出"
    echo
    read -r -p "請輸入選項 (1-6): " choice
fi

case $choice in
    1)
        kill_processes
        echo "正在啟動全部服務..."
        echo "前端: http://localhost:${FRONTEND_PORT}"
        echo "Review App: http://localhost:${REVIEW_APP_PORT}"
        echo "後端: http://localhost:${BACKEND_PORT}"
        echo
        echo "按 Ctrl+C 停止服務"
        echo
        npm run dev:all
        ;;
    2)
        kill_processes
        echo "正在啟動前端服務..."
        echo "位址: http://localhost:${FRONTEND_PORT}"
        echo
        npm run start:frontend
        ;;
    3)
        kill_processes
        echo "正在啟動 Review App 服務..."
        echo "位址: http://localhost:${REVIEW_APP_PORT}"
        echo
        npm run start:review-app
        ;;
    4)
        kill_processes
        echo "正在啟動後端服務..."
        echo "位址: http://localhost:${BACKEND_PORT}"
        echo
        npm run start:backend
        ;;
    5)
        kill_processes
        echo "已退出腳本"
        ;;
    6)
        echo
        echo "已退出腳本"
        ;;
    *)
        echo
        echo "無效的選項，已退出"
        ;;
esac
