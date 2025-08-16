@echo off
title SCTE-35 Broadcast Middleware - Complete System
color 0A

echo.
echo ========================================
echo    SCTE-35 BROADCAST MIDDLEWARE
echo    Complete System Launcher
echo ========================================
echo.

:: Check if Node.js is installed
echo [1/8] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
)

:: Check if FFmpeg is installed
echo [2/8] Checking FFmpeg installation...
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  FFmpeg is not installed or not in PATH
    echo FFmpeg is required for SCTE-35 injection
    echo Please install FFmpeg from https://ffmpeg.org/
    echo.
    echo Press any key to continue anyway...
    pause >nul
) else (
    echo ✅ FFmpeg is installed
)

:: Check if ports are available
echo [3/8] Checking port availability...
netstat -an | findstr "LISTENING" | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ❌ Port 3000 is already in use
    echo Please stop any services using port 3000
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Port 3000 is available
)

netstat -an | findstr "LISTENING" | findstr ":1935" >nul
if %errorlevel% equ 0 (
    echo ❌ Port 1935 is already in use
    echo Please stop any services using port 1935
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Port 1935 is available
)

:: Install dependencies
echo [4/8] Installing/updating dependencies...
cd /d "%~dp0server"
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
) else (
    echo Dependencies already installed
)

:: Start the main SCTE-35 middleware server
echo [5/8] Starting SCTE-35 Middleware Server...
start "SCTE-35 Middleware" cmd /k "cd /d "%~dp0server" && node server.js"

:: Wait for server to start
echo Waiting for server to start...
timeout /t 3 /nobreak >nul

:: Test server health
echo [6/8] Testing server health...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 10; if ($response.StatusCode -eq 200) { Write-Host '✅ SCTE-35 Middleware server is running' } else { Write-Host '❌ Server health check failed' } } catch { Write-Host '❌ Server health check failed' }"

:: Test RTMP functionality (built into main server)
echo [7/8] Testing RTMP functionality...
timeout /t 2 /nobreak >nul
netstat -an | findstr "LISTENING" | findstr ":1935" >nul
if %errorlevel% equ 0 (
    echo ✅ RTMP server is running (integrated)
) else (
    echo ⚠️  RTMP server may not be ready yet
)

echo [8/8] System startup complete...

echo.
echo ========================================
echo    SYSTEM STARTUP COMPLETE
echo ========================================
echo.
echo 🎯 Available Services:
echo.
echo 📺 SCTE-35 Middleware Dashboard:
echo    http://localhost:3000
echo.
echo 📡 RTMP Server:
echo    rtmp://localhost:1935/live
echo.
echo 📡 RTMP Server (Integrated):
echo    rtmp://localhost:1935/live
echo.
echo 📺 Stream Management:
echo    Available through dashboard
echo.
echo ========================================
echo    OBS STUDIO CONFIGURATION
echo ========================================
echo.
echo Service: Custom
echo Server: rtmp://localhost:1935/live
echo Stream Key: stream1 (or any name)
echo.
echo ========================================
echo    QUICK ACTIONS
echo ========================================
echo.
echo Press 1 to open Dashboard in browser
echo Press 2 to test RTMP connection
echo Press 3 to show system status
echo Press 4 to stop all services
echo Press 5 to exit
echo.

:menu
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo Opening dashboard...
    start http://localhost:3000
    goto menu
)

if "%choice%"=="2" (
    echo Testing RTMP connection...
    netstat -an | findstr "LISTENING" | findstr ":1935" >nul
    if %errorlevel% equ 0 (
        echo ✅ RTMP server is running on port 1935
    ) else (
        echo ❌ RTMP server is not responding on port 1935
    )
    echo.
    goto menu
)

if "%choice%"=="3" (
    echo.
    echo ========================================
    echo    SYSTEM STATUS
    echo ========================================
    echo.
    echo Checking SCTE-35 Middleware...
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '✅ SCTE-35 Middleware: Running' } else { Write-Host '❌ SCTE-35 Middleware: Not responding' } } catch { Write-Host '❌ SCTE-35 Middleware: Not responding' }"
    echo.
    echo Checking RTMP Server...
    netstat -an | findstr "LISTENING" | findstr ":1935" >nul
    if %errorlevel% equ 0 (
        echo ✅ RTMP Server: Running (integrated)
    ) else (
        echo ❌ RTMP Server: Not responding
    )
    echo.
    echo Checking ports...
    netstat -an | findstr "LISTENING" | findstr ":3000" >nul && echo ✅ Port 3000: Active || echo ❌ Port 3000: Not active
    netstat -an | findstr "LISTENING" | findstr ":1935" >nul && echo ✅ Port 1935: Active || echo ❌ Port 1935: Not active
    echo.
    goto menu
)

if "%choice%"=="4" (
    echo.
    echo Stopping all services...
    echo This will close all Node.js processes
    echo.
    set /p confirm="Are you sure? (y/N): "
    if /i "%confirm%"=="y" (
        taskkill /f /im node.exe >nul 2>&1
        echo ✅ All services stopped
        echo.
        pause
        exit /b 0
    ) else (
        echo Operation cancelled
        echo.
        goto menu
    )
)

if "%choice%"=="5" (
    echo.
    echo Exiting launcher...
    echo Note: Services will continue running in their own windows
    echo To stop all services, use option 4 or close the service windows manually
    echo.
    pause
    exit /b 0
)

echo Invalid choice. Please enter 1-5.
goto menu
