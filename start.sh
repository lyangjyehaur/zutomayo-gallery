#!/bin/bash

echo "========================================"
echo "  ZUTOMAYO MV Gallery 一鍵啟動腳本"
echo "========================================"
echo

echo "正在檢查 Node.js 版本..."
node --version
if [ $? -ne 0 ]; then
    echo "錯誤: Node.js 未安裝或未加入至 PATH"
    echo "請安裝 Node.js >= 18 版本"
    exit 1
fi

echo
echo "正在檢查 npm 套件管理器..."
npm --version
if [ $? -ne 0 ]; then
    echo "錯誤: npm 未正確安裝"
    exit 1
fi

echo
echo "正在檢查依賴是否已安裝..."
if [ ! -d "node_modules" ]; then
    echo "未找到依賴，正在安裝..."
    npm install
    if [ $? -ne 0 ]; then
        echo "錯誤: 安裝依賴失敗"
        exit 1
    fi
fi

echo
echo "依賴檢查完成！"
echo

# 顯示目前佔用 Port 的進程
function show_processes() {
    echo "========================================"
    echo " 目前運行的服務狀態："
    echo "----------------------------------------"
    echo "前端 (Port 5173):"
    lsof -i :5173 | grep LISTEN || echo "  (無運行中的前端服務)"
    echo "----------------------------------------"
    echo "後端 (Port 5000):"
    lsof -i :5000 | grep LISTEN || echo "  (無運行中的後端服務)"
    echo "========================================"
    echo
}

# 終止目前佔用 Port 的進程
function kill_processes() {
    echo "正在檢查並停止已運行的服務..."
    local frontend_pids=$(lsof -t -i :5173)
    local backend_pids=$(lsof -t -i :5000)
    local stopped=0

    if [ ! -z "$frontend_pids" ]; then
        echo "停止前端服務 (Port 5173, PIDs: $(echo $frontend_pids | tr '\n' ' '))..."
        echo "$frontend_pids" | xargs kill -9 2>/dev/null
        stopped=1
    fi

    if [ ! -z "$backend_pids" ]; then
        echo "停止後端服務 (Port 5000, PIDs: $(echo $backend_pids | tr '\n' ' '))..."
        echo "$backend_pids" | xargs kill -9 2>/dev/null
        stopped=1
    fi
    
    if [ $stopped -eq 1 ]; then
        echo "✅ 服務清理完成！"
    else
        echo "✅ 目前沒有佔用 Port 的服務。"
    fi
    echo
}

# 執行狀態顯示
show_processes

echo "請選擇操作："
echo "1. 一鍵啟動前後端（推薦）"
echo "2. 只啟動前端"
echo "3. 只啟動後端"
echo "4. 僅停止所有運行中的服務並退出"
echo "5. 退出"
echo
read -p "請輸入選項 (1-5): " choice

case $choice in
    1)
        kill_processes
        echo "正在啟動前後端服務..."
        echo "前端: http://localhost:5173"
        echo "後端: http://localhost:5000"
        echo
        echo "按 Ctrl+C 停止服務"
        echo
        npm run dev
        ;;
    2)
        kill_processes
        echo "正在啟動前端服務..."
        echo "位址: http://localhost:5173"
        echo
        npm run start:frontend
        ;;
    3)
        kill_processes
        echo "正在啟動後端服務..."
        echo "位址: http://localhost:5000"
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
