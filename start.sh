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
echo "請選擇啟動方式："
echo "1. 一鍵啟動前後端（推薦）"
echo "2. 只啟動前端"
echo "3. 只啟動後端"
echo "4. 退出"
echo
read -p "請輸入選項 (1-4): " choice

case $choice in
    1)
        echo
        echo "正在啟動前後端服務..."
        echo "前端: http://localhost:5173"
        echo "後端: http://localhost:5000"
        echo
        echo "按 Ctrl+C 停止服務"
        echo
        npm run dev
        ;;
    2)
        echo
        echo "正在啟動前端服務..."
        echo "位址: http://localhost:5173"
        echo
        npm run start:frontend
        ;;
    3)
        echo
        echo "正在啟動後端服務..."
        echo "位址: http://localhost:5000"
        echo
        npm run start:backend
        ;;
    *)
        echo
        echo "已退出"
        ;;
esac