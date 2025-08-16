@echo off
title Create Desktop Shortcut for SCTE-35 System
color 0A

echo.
echo ========================================
echo   Creating Desktop Shortcut
echo ========================================
echo.

REM Get current directory
set "CURRENT_DIR=%~dp0"
set "SHORTCUT_NAME=SCTE-35 Complete System"
set "TARGET_FILE=%CURRENT_DIR%RUN-EVERYTHING.bat"

REM Create VBS script to create shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%USERPROFILE%\Desktop\%SHORTCUT_NAME%.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%TARGET_FILE%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> CreateShortcut.vbs
echo oLink.Description = "SCTE-35 Management System - One-Click Launch" >> CreateShortcut.vbs
echo oLink.IconLocation = "shell32.dll,25" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

REM Execute VBS script
cscript CreateShortcut.vbs >nul

REM Clean up
del CreateShortcut.vbs

echo [SUCCESS] Desktop shortcut created!
echo.
echo Shortcut Details:
echo - Name: %SHORTCUT_NAME%
echo - Location: Desktop
echo - Target: RUN-EVERYTHING.bat
echo - Description: One-click SCTE-35 system launcher
echo.
echo You can now double-click the desktop shortcut to launch
echo the complete SCTE-35 system with all interfaces!
echo.
pause
