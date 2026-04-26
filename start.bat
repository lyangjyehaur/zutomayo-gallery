@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   ZUTOMAYO Gallery 一鍵啟動
echo ========================================
echo.

echo 正在啟動前後端服務...
echo 前端：http://localhost:5173
echo 後端：http://localhost:5000
echo.
echo 按 Ctrl+C 停止服務
echo.

npm run dev

pause