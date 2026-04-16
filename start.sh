#!/bin/bash

echo "========================================"
echo "  ZUTOMAYO MV Gallery 一键启动脚本"
echo "========================================"
echo

echo "正在检查 Node.js 版本..."
node --version
if [ $? -ne 0 ]; then
    echo "错误: Node.js 未安装或未添加到PATH"
    echo "请安装 Node.js >= 18 版本"
    exit 1
fi

echo
echo "正在检查 npm 包管理器..."
npm --version
if [ $? -ne 0 ]; then
    echo "错误: npm 未正确安装"
    exit 1
fi

echo
echo "正在检查依赖是否已安装..."
if [ ! -d "node_modules" ]; then
    echo "未找到依赖，正在安装..."
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 安装依赖失败"
        exit 1
    fi
fi

echo
echo "依赖检查完成！"
echo
echo "请选择启动方式："
echo "1. 一键启动前后端（推荐）"
echo "2. 只启动前端"
echo "3. 只启动后端"
echo "4. 退出"
echo
read -p "请输入选项 (1-4): " choice

case $choice in
    1)
        echo
        echo "正在启动前后端服务..."
        echo "前端: http://localhost:5173"
        echo "后端: http://localhost:5000"
        echo
        echo "按 Ctrl+C 停止服务"
        echo
        npm run dev
        ;;
    2)
        echo
        echo "正在启动前端服务..."
        echo "地址: http://localhost:5173"
        echo
        npm run start:frontend
        ;;
    3)
        echo
        echo "正在启动后端服务..."
        echo "地址: http://localhost:5000"
        echo
        npm run start:backend
        ;;
    *)
        echo
        echo "已退出"
        ;;
esac