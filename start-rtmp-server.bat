@echo off
title SCTE-35 Standalone RTMP Server
color 0A

echo.
echo ========================================
echo    SCTE-35 STANDALONE RTMP SERVER
echo ========================================
echo.

cd /d "%~dp0server"

echo Starting standalone RTMP server...
echo.
echo RTMP Server will be available at:
echo   - RTMP: rtmp://localhost:1935
echo   - HTTP: http://localhost:8000
echo   - HLS:  http://localhost:8000/live/{streamKey}/index.m3u8
echo.

node standalone-rtmp-server.js

pause
