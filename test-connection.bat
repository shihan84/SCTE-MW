@echo off
title Test RTMP Connection
color 0A

echo.
echo ========================================
echo   Testing RTMP Connection
echo ========================================
echo.

REM Test if middleware is running
echo [INFO] Testing middleware connection...
curl -s http://localhost:3000/api/health
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Middleware is running
) else (
    echo [ERROR] Middleware not responding
    echo Please run launch-all.bat first
    pause
    exit /b 1
)

echo.
echo [INFO] Testing stream detection...
echo.
echo Current streams:
curl -s http://localhost:3000/api/streams

echo.
echo.
echo [INFO] Manual stream creation test...
echo Creating stream1 manually...

curl -X POST http://localhost:3000/api/streams/stream1/start ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Test Stream 1\"}"

echo.
echo.
echo [INFO] Checking stream status after creation...
curl -s http://localhost:3000/api/streams

echo.
echo.
echo [INFO] Testing CUE-OUT injection...
curl -X POST http://localhost:3000/api/streams/stream1/cue-out ^
  -H "Content-Type: application/json" ^
  -d "{\"duration\": 30}"

echo.
echo.
echo Press any key to continue...
pause >nul
