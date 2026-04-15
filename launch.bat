@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   ZUTOMAYO MV Gallery Launcher
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js >= 18 from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version

echo.
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not found
    pause
    exit /b 1
)

echo npm found:
npm --version

echo.
echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Starting services...
echo Frontend will run at: http://localhost:5173
echo Backend will run at: http://localhost:5000
echo ========================================
echo.
echo Press Ctrl+C to stop both services
echo.

npm run dev

echo.
pause