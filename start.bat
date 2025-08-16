@echo off
title SCTE-35 Broadcast Middleware
color 0A

echo.
echo ========================================
echo   SCTE-35 Broadcast Middleware v1.0
echo   Windows Portable Edition
echo ========================================
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found in PATH
    echo.
    echo Please ensure Node.js is installed or use portable Node.js:
    echo 1. Download Node.js portable from https://nodejs.org/
    echo 2. Extract to bin/nodejs/ folder
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

REM Check if FFmpeg is available
where ffmpeg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] FFmpeg not found in PATH
    echo.
    echo Please ensure FFmpeg is installed or use portable FFmpeg:
    echo 1. Download FFmpeg from https://ffmpeg.org/download.html
    echo 2. Extract to bin/ffmpeg/ folder
    echo 3. Add bin/ffmpeg/bin to PATH or copy ffmpeg.exe to system PATH
    echo.
    pause
    exit /b 1
)

REM Set working directory to script location
cd /d "%~dp0"

REM Check if server directory exists
if not exist "server" (
    echo [ERROR] Server directory not found
    echo Please ensure the complete SCTE-35 middleware package is extracted
    pause
    exit /b 1
)

REM Install Node.js dependencies if needed
if not exist "server\node_modules" (
    echo [INFO] Installing Node.js dependencies...
    cd server
    npm install express cors
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        echo Please check your internet connection and try again
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Dependencies installed
    echo.
)

REM Display startup information
echo [INFO] Starting SCTE-35 Middleware...
echo.
echo Configuration:
echo - RTMP Input Port: 1935
echo - API Port: 3000
echo - Web UI: http://localhost:3000
echo - SCTE-35 PID: 500
echo - Base Event ID: 100023
echo.
echo OBS Configuration:
echo - Output Mode: Advanced
echo - Type: Custom Output (FFmpeg)
echo - FFmpeg Output Type: Output to URL
echo - File path or URL: rtmp://localhost:1935/live/stream1
echo - Container Format: flv
echo - Video Encoder: libx264
echo - Audio Encoder: aac
echo.
echo Flussonic Configuration:
echo - Input: srt://localhost:1234?streamid=stream1
echo - SCTE-35 PID: 500
echo.
echo Press Ctrl+C to stop the middleware
echo ========================================
echo.

REM Start the middleware server
cd server
node server.js

REM Handle exit
echo.
echo [INFO] SCTE-35 Middleware stopped
pause
