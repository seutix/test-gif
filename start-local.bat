@echo off
setlocal
cd /d "%~dp0"
echo Installing dependencies (first run may take a few minutes)...
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
echo.
echo Starting KADR editor at http://localhost:5173 ...
call npm run dev
pause
