@echo off
title VisualMind AI - Portable Edition
echo ======================================================================
echo                  VISUALMIND AI - PORTABLE APP
echo ======================================================================
echo.
echo Launching standalone VisualMind AI application...
echo.

set "PORTABLE=%~dp0dist-installer\VisualMind AI 1.0.0.exe"

if exist "%PORTABLE%" (
    echo [OK] Portable executable found. Starting VisualMind AI...
    start "" "%PORTABLE%"
) else (
    echo [ERROR] Portable executable not found at:
    echo "%PORTABLE%"
    echo.
    pause
)
