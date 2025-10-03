@echo off
echo.
echo ========================================
echo   Alpaca Main - Development Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Check if uv is installed
where uv >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] uv is not installed or not in PATH
    echo Please install uv: https://github.com/astral-sh/uv
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not running or not installed
    echo Please start Docker Desktop
    exit /b 1
)

echo [OK] All prerequisites are installed
echo.
echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation failed
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Start infrastructure: npm run docker:up
echo   2. Start frontend: npm run dev:frontend
echo   3. Access app at http://localhost:5173
echo.
