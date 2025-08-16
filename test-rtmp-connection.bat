@echo off
title RTMP Connection Test
color 0B

echo.
echo ========================================
echo    RTMP CONNECTION TEST UTILITY
echo ========================================
echo.

echo Checking RTMP server status...
echo.

REM Check if RTMP server is running
netstat -an | findstr ":1935" > nul
if %errorlevel% equ 0 (
    echo ✅ RTMP Server is running on port 1935
) else (
    echo ❌ RTMP Server is NOT running on port 1935
    echo.
    echo Please start the RTMP server first:
    echo   start-rtmp-server.bat
    echo.
    pause
    exit /b 1
)

echo.
echo Checking HTTP server status...
netstat -an | findstr ":8000" > nul
if %errorlevel% equ 0 (
    echo ✅ HTTP Server is running on port 8000
) else (
    echo ⚠️  HTTP Server is NOT running on port 8000
)

echo.
echo Checking test HTTP server...
netstat -an | findstr ":8001" > nul
if %errorlevel% equ 0 (
    echo ✅ Test HTTP Server is running on port 8001
) else (
    echo ❌ Test HTTP Server is NOT running on port 8001
)

echo.
echo ========================================
echo    OBS CONFIGURATION GUIDE
echo ========================================
echo.
echo 📋 OBS Studio Settings:
echo    Service: Custom
echo    Server: rtmp://localhost:1935/live
echo    Stream Key: stream1
echo.
echo 🔗 Test URLs:
echo    RTMP: rtmp://localhost:1935/live/stream1
echo    HLS:  http://localhost:8000/live/stream1/index.m3u8
echo    Test: http://localhost:8001
echo.

echo Testing HTTP connectivity...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8001' -UseBasicParsing | Out-Null; Write-Host '✅ HTTP test successful' } catch { Write-Host '❌ HTTP test failed' }"

echo.
echo ========================================
echo    TROUBLESHOOTING
echo ========================================
echo.
echo If OBS cannot connect:
echo 1. Check Windows Firewall settings
echo 2. Verify no other RTMP server is running
echo 3. Try restarting the RTMP server
echo 4. Check OBS log files
echo.

echo Press any key to continue...
pause > nul
