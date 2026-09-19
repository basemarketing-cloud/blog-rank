@echo off
cd /d "%~dp0"
set "RANK_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%RANK_NODE%" goto bundled
where node >nul 2>nul
if errorlevel 1 goto missing
start "" "http://127.0.0.1:3210"
node src/server.mjs
pause
exit /b
:bundled
start "" "http://127.0.0.1:3210"
"%RANK_NODE%" src/server.mjs
pause
exit /b
:missing
echo Node.js is required. Please install Node.js 22 or newer.
pause
