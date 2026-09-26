@echo off
title VisualMind AI - Windows Installer
echo ======================================================================
echo                     VISUALMIND AI INSTALLER
echo ======================================================================
echo.
echo Launching VisualMind AI Setup Wizard...
echo.

set "INSTALLER=%~dp0dist-installer\VisualMind AI Setup 1.0.0.exe"

if exist "%INSTALLER%" (
    echo [OK] Installer found. Starting setup...
    start "" "%INSTALLER%"
) else (
    echo [ERROR] Setup file not found at:
    echo "%INSTALLER%"
    echo.
    pause
)
