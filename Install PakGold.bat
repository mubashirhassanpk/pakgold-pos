@echo off
title PakGold POS - Installer
cd /d "%~dp0"

echo ============================================
echo   PakGold POS - One-time Setup
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Please install Node.js 20+ from https://nodejs.org  then run this again.
  echo.
  pause
  exit /b 1
)

echo Installing dependencies (this can take a few minutes)...
call npm install
if errorlevel 1 ( echo [ERROR] npm install failed. & pause & exit /b 1 )

echo.
echo Building the application...
call npm run build
if errorlevel 1 ( echo [ERROR] build failed. & pause & exit /b 1 )

echo.
echo ============================================
echo   Setup complete!
echo   Double-click "Start PakGold.bat" to run.
echo ============================================
echo.
pause
