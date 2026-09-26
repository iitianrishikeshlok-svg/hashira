@echo off
setlocal enabledelayedexpansion
title VisualMind AI Launcher

echo ============================================================================
echo   VisualMind AI - Starting Local Services
echo ============================================================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

:: Start the VisualMind backend server in minimized window if not already running
netstat -ano | findstr :5000 | findstr LISTENING >nul
if %ERRORLEVEL% neq 0 (
    echo Starting VisualMind AI Server on port 5000...
    start /min "VisualMind AI Server" cmd /c "npm.cmd run server"
    timeout /t 3 /nobreak >nul
) else (
    echo VisualMind AI Server is already active on port 5000.
)

:: Launch in native application window mode
echo Launching VisualMind AI Desktop Workspace...

where msedge >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" msedge --app=http://localhost:5000
    exit /b 0
)

where chrome >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" chrome --app=http://localhost:5000
    exit /b 0
)

:: Default browser fallback
start http://localhost:5000
exit /b 0
