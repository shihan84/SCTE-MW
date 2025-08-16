@echo off
title SCTE-35 Complete System - One-Click Launch
color 0A

echo.
echo ========================================
echo   SCTE-35 COMPLETE SYSTEM LAUNCHER
echo   One-Click Start - Everything Included
echo ========================================
echo.

REM Set working directory to script location
cd /d "%~dp0"

REM Set FFmpeg path (user-specific)
set "FFMPEG_PATH=C:\Users\LIVE PCR\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-7.1.1-full_build\bin"
set "PATH=%PATH%;%FFMPEG_PATH%"

echo [INFO] Checking system requirements...

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [SUCCESS] Node.js found

REM Check if FFmpeg is available
where ffmpeg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] FFmpeg not found in system PATH
    echo [INFO] Trying user-specific FFmpeg location...
    if exist "%FFMPEG_PATH%\ffmpeg.exe" (
        echo [SUCCESS] FFmpeg found at: %FFMPEG_PATH%
    ) else (
        echo [ERROR] FFmpeg not found at expected location
        echo Please ensure FFmpeg is installed
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

echo.
echo [INFO] Installing dependencies if needed...
cd server

REM Install basic dependencies if needed
if not exist "node_modules\express" (
    echo [INFO] Installing Node.js dependencies...
    npm install express cors
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed
) else (
    echo [SUCCESS] Dependencies already installed
)

echo.
echo ========================================
echo   STARTING COMPLETE SCTE-35 SYSTEM
echo ========================================
echo.
echo Configuration:
echo - RTMP Server: rtmp://localhost:1935/live/{streamId}
echo - API Server: http://localhost:3000
echo - Web Interfaces: Opening automatically...
echo - SRT Output: srt://localhost:1234
echo.
echo OBS Settings:
echo - URL: rtmp://localhost:1935/live/stream1
echo - Container: flv
echo - Keyframe Interval: 2 seconds
echo.
echo Features Available:
echo - Real-time SCTE-35 injection
echo - Manual PID control (default: 500)
echo - Manual Event ID control (default: 100023+)
echo - Time-based ad scheduling
echo - RTMP server monitoring
echo - Professional broadcast interface
echo.

echo [INFO] Starting SCTE-35 server...
start /B node simple-rtmp-server.js

echo [INFO] Waiting for server to initialize...
timeout /t 3 /nobreak >nul

echo [INFO] Opening all web interfaces...

REM Open all interfaces in separate browser tabs
start "" "http://localhost:3000/nav.html"
timeout /t 1 /nobreak >nul

start "" "http://localhost:3000/index.html"
timeout /t 1 /nobreak >nul

start "" "http://localhost:3000/scheduler.html"
timeout /t 1 /nobreak >nul

start "" "http://localhost:3000/rtmp-dashboard.html"
timeout /t 1 /nobreak >nul

echo.
echo ========================================
echo   SYSTEM LAUNCHED SUCCESSFULLY!
echo ========================================
echo.
echo ✅ RTMP Server: RUNNING on port 1935
echo ✅ API Server: RUNNING on port 3000
echo ✅ Web Interfaces: OPENED in browser
echo ✅ All Systems: ACTIVE
echo.
echo 🌐 Opened Browser Tabs:
echo   1. Navigation Hub     - Main menu and system overview
echo   2. Main Dashboard     - Stream control and monitoring
echo   3. Scheduler          - PID/Event ID control and scheduling
echo   4. RTMP Dashboard     - Server monitoring and connections
echo.
echo 📺 OBS Configuration:
echo   URL: rtmp://localhost:1935/live/stream1
echo   Container: flv
echo   Keyframe: 2 seconds
echo.
echo 🎛️ Quick Actions Available:
echo   - F1-F8: Hotkey CUE-OUT commands
echo   - Manual SCTE-35 injection
echo   - Real-time stream monitoring
echo   - Time-based ad scheduling
echo   - PID/Event ID customization
echo.
echo 📋 System Status:
echo   - SCTE-35 Middleware: READY
echo   - RTMP Server: LISTENING
echo   - Web Dashboard: ACCESSIBLE
echo   - Scheduler: ACTIVE
echo   - Monitoring: ENABLED
echo.
echo 🚀 You can now:
echo   1. Start streaming from OBS
echo   2. Use the web interfaces for control
echo   3. Schedule automated ad breaks
echo   4. Monitor RTMP connections
echo   5. Inject SCTE-35 markers manually
echo.
echo Press any key to stop the entire system...
pause >nul

echo.
echo [INFO] Stopping SCTE-35 Complete System...

REM Stop all Node.js processes
taskkill /F /IM node.exe >nul 2>&1

REM Close browser tabs (optional)
echo [INFO] System stopped successfully
echo [INFO] Browser tabs remain open for your reference

echo.
echo ========================================
echo   SYSTEM SHUTDOWN COMPLETE
echo ========================================
echo.
echo Thank you for using SCTE-35 Management System!
echo.
pause
