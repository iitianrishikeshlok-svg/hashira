@echo off
setlocal enabledelayedexpansion
title VisualMind AI - Automated Desktop Installer

echo ============================================================================
echo   VisualMind AI - Automated Windows Desktop Installer
echo   Visual Knowledge Extraction Engine for Complex Study Materials
echo ============================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found on your system PATH.
    echo Please install Node.js v20+ from https://nodejs.org/ and rerun this installer.
    pause
    exit /b 1
)

echo [1/4] Node.js environment detected:
node -v
echo.

:: 2. Check dependencies
echo [2/4] Verifying and installing application dependencies...
if not exist "node_modules" (
    call npm.cmd install
) else (
    echo Dependencies are already installed.
)
echo.

:: 3. Build Production Bundle
echo [3/4] Building optimized production application assets...
call npm.cmd run build
echo.

:: 4. Create Windows Desktop Shortcut
echo [4/4] Creating Windows Desktop Shortcut...
set SCRIPT_DIR=%~dp0
set TARGET_SCRIPT=%SCRIPT_DIR%Start-VisualMind.bat
set SHORTCUT_PATH=%USERPROFILE%\Desktop\VisualMind AI.lnk

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_SCRIPT%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Save()"

echo.
echo ============================================================================
echo   SUCCESS: VisualMind AI is now installed!
echo   Desktop shortcut created: "%USERPROFILE%\Desktop\VisualMind AI.lnk"
echo ============================================================================
echo.
set /p LAUNCH="Would you like to launch VisualMind AI right now? (Y/N): "
if /i "%LAUNCH%"=="Y" (
    start "" "%TARGET_SCRIPT%"
)

exit /b 0
