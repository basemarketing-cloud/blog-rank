@echo off
cd /d "%~dp0"
set "RANK_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%RANK_NODE%" (
  "%RANK_NODE%" scripts/probe.mjs
) else (
  node scripts/probe.mjs
)
pause
