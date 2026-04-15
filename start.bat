@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   ZUTOMAYO MV Gallery 一键启动
echo ========================================
echo.

echo 正在启动前后端服务...
echo 前端：http://localhost:5173
echo 后端：http://localhost:5000
echo.
echo 按 Ctrl+C 停止服务
echo.

npm run dev

pause