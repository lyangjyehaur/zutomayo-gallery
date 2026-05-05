#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

MIN_NODE_MAJOR=20
MIN_NPM_MAJOR=10
FRONTEND_PORT=5173
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
if [ ! -d "node_modules" ] || [ ! -d "frontend/node_modules" ] || [ ! -d "backend/node_modules" ]; then
    echo "未找到完整依賴，將執行 npm run install:all ..."
    npm run install:all
fi
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
    echo "後端 (Port ${BACKEND_PORT}):"
    lsof -i :"${BACKEND_PORT}" | grep LISTEN || echo "  (無運行中的後端服務)"
    echo "========================================"
    echo
}

# 終止目前佔用 Port 的進程
function kill_processes() {
    echo "正在檢查並停止已運行的服務..."
    local frontend_pids
    local backend_pids
    frontend_pids="$(lsof -t -i :"${FRONTEND_PORT}" || true)"
    backend_pids="$(lsof -t -i :"${BACKEND_PORT}" || true)"
    local stopped=0

    if [ -n "$frontend_pids" ]; then
        echo "停止前端服務 (Port ${FRONTEND_PORT}, PIDs: $(echo "$frontend_pids" | tr '\n' ' '))..."
        echo "$frontend_pids" | xargs kill -TERM 2>/dev/null || true
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
        backend_pids="$(lsof -t -i :"${BACKEND_PORT}" || true)"
        if [ -n "$frontend_pids" ]; then
            echo "前端仍在運行，強制結束..."
            echo "$frontend_pids" | xargs kill -KILL 2>/dev/null || true
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
        backend|be) echo "3" ;;
        stop) echo "4" ;;
        exit) echo "5" ;;
        1|2|3|4|5) echo "$1" ;;
        "") echo "" ;;
        *)
            echo "未知參數: $1"
            echo "可用參數: all|frontend|backend|stop|exit"
            exit 1
            ;;
    esac
}

choice="$(resolve_choice "${1:-}")"
if [ -z "$choice" ]; then
    show_processes
    echo "請選擇操作："
    echo "1. 一鍵啟動前後端（推薦）"
    echo "2. 只啟動前端"
    echo "3. 只啟動後端"
    echo "4. 僅停止所有運行中的服務並退出"
    echo "5. 退出"
    echo
    read -r -p "請輸入選項 (1-5): " choice
fi

case $choice in
    1)
        kill_processes
        echo "正在啟動前後端服務..."
        echo "前端: http://localhost:${FRONTEND_PORT}"
        echo "後端: http://localhost:${BACKEND_PORT}"
        echo
        echo "按 Ctrl+C 停止服務"
        echo
        npm run dev
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
        echo "正在啟動後端服務..."
        echo "位址: http://localhost:${BACKEND_PORT}"
        echo
        npm run start:backend
        ;;
    4)
        kill_processes
        echo "已退出腳本"
        ;;
    5)
        echo
        echo "已退出腳本"
        ;;
    *)
        echo
        echo "無效的選項，已退出"
        ;;
esac
