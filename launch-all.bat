@echo off
title SCTE-35 Broadcast System - Complete Launch
color 0A

echo.
echo ========================================
echo   SCTE-35 Broadcast System Launcher
echo   Complete System Startup
echo ========================================
echo.

REM Set working directory to script location
cd /d "%~dp0"

REM Set FFmpeg path (user-specific)
set "FFMPEG_PATH=C:\Users\LIVE PCR\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-7.1.1-full_build\bin"
set "PATH=%PATH%;%FFMPEG_PATH%"

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found in PATH
    echo Please install Node.js or add it to PATH
    pause
    exit /b 1
)

REM Check if FFmpeg is available
where ffmpeg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] FFmpeg not found in PATH
    echo Trying user-specific FFmpeg location...
    if exist "%FFMPEG_PATH%\ffmpeg.exe" (
        echo [SUCCESS] FFmpeg found at: %FFMPEG_PATH%
    ) else (
        echo [ERROR] FFmpeg not found at expected location
        echo Please ensure FFmpeg is installed or run fix-ffmpeg-path.bat
        echo.
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] FFmpeg found in system PATH
)

REM Check if server directory exists
if not exist "server" (
    echo [ERROR] Server directory not found
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "server\node_modules" (
    echo [INFO] Installing Node.js dependencies...
    cd server
    npm install express cors
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Dependencies installed
    echo.
)

echo [INFO] Starting SCTE-35 Middleware Server...
echo.
echo Configuration:
echo - Server API: http://localhost:3000
echo - Web UI: http://localhost:3000
echo - RTMP Input: rtmp://localhost:1935/live/{streamId}
echo - SRT Output: srt://localhost:1234
echo.
echo The web browser will open automatically in 5 seconds...
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start the server in background and open browser
cd server
start /B node server.js

REM Wait for server to start
timeout /t 5 /nobreak >nul

REM Open web browser to the UI
start http://localhost:3000

REM Keep the console open and show server status
echo [SUCCESS] System launched successfully!
echo.
echo - Middleware Server: RUNNING
echo - Web UI: OPENED in browser
echo - API Endpoints: ACTIVE
echo.
echo You can now:
echo 1. Configure OBS to stream to rtmp://localhost:1935/live/stream1
echo 2. Use the web interface for SCTE-35 control
echo 3. Press F1-F8 for quick CUE-OUT commands
echo 4. Use Ctrl+Shift+I for emergency CUE-IN ALL
echo.
echo Press any key to stop the system...
pause >nul

REM Stop the server
echo.
echo [INFO] Stopping SCTE-35 Middleware...
taskkill /F /IM node.exe >nul 2>&1
echo [SUCCESS] System stopped
pause
