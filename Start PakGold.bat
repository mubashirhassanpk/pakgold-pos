@echo off
title PakGold POS
cd /d "%~dp0"

if not exist ".next" (
  echo PakGold POS is not installed yet.
  echo Please double-click "Install PakGold.bat" first.
  echo.
  pause
  exit /b 1
)

echo Starting PakGold POS... a browser window will open shortly.
echo Keep THIS window open while you use the app. Close it to stop.
echo.
call npm run launch
pause
