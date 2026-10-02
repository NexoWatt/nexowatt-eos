@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0MERGE_UPDATE.ps1"
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo.
  echo NexoWatt EOS Merge-Pruefung fehlgeschlagen. Exit-Code %EXITCODE%
  pause
  exit /b %EXITCODE%
)
echo.
echo NexoWatt EOS Merge-Pruefung erfolgreich.
pause
