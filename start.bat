@echo off
chcp 65001 >nul
cd /d "%~dp0"
setlocal enabledelayedexpansion

set "MIN_NODE_MAJOR=20"
set "MIN_NPM_MAJOR=10"

echo ========================================
echo   ZUTOMAYO Gallery 一鍵啟動
echo ========================================
echo.

echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 20 LTS ^(>=20 ^<26^)
    pause
    exit /b 1
)
for /f "tokens=1 delims=." %%a in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%a"
if !NODE_MAJOR! lss %MIN_NODE_MAJOR% (
    echo ERROR: Node.js version is too old. Current major: !NODE_MAJOR!, required: >= %MIN_NODE_MAJOR%
    pause
    exit /b 1
)
echo Node.js version:
node --version

echo.
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not found
    pause
    exit /b 1
)
for /f "tokens=1 delims=." %%a in ('npm --version') do set "NPM_MAJOR=%%a"
if !NPM_MAJOR! lss %MIN_NPM_MAJOR% (
    echo ERROR: npm version is too old. Current major: !NPM_MAJOR!, required: >= %MIN_NPM_MAJOR%
    pause
    exit /b 1
)
echo npm version:
npm --version

echo.
echo Checking dependencies...
if not exist "node_modules" goto :install_all
if not exist "frontend\node_modules" goto :install_all
if not exist "backend\node_modules" goto :install_all
goto :deps_ok

:install_all
echo Missing dependencies detected, running npm run install:all ...
npm run install:all
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

:deps_ok
echo Dependencies are ready.
echo.

echo 正在啟動前後端服務...
echo 前端：http://localhost:5173
echo 後端：http://localhost:5010
echo.
echo 按 Ctrl+C 停止服務
echo.

npm run dev

pause
