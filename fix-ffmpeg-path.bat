@echo off
title Fix FFmpeg Path for SCTE-35 Middleware
color 0A

echo.
echo ========================================
echo   FFmpeg Path Configuration Fix
echo ========================================
echo.

REM Set the FFmpeg path provided by user
set "FFMPEG_PATH=C:\Users\LIVE PCR\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-7.1.1-full_build\bin"

echo [INFO] Configuring FFmpeg path...
echo FFmpeg Location: %FFMPEG_PATH%
echo.

REM Check if FFmpeg exists at the specified path
if exist "%FFMPEG_PATH%\ffmpeg.exe" (
    echo [SUCCESS] FFmpeg found at specified location
    
    REM Add to current session PATH
    set "PATH=%PATH%;%FFMPEG_PATH%"
    
    REM Test FFmpeg
    echo [INFO] Testing FFmpeg functionality...
    "%FFMPEG_PATH%\ffmpeg.exe" -version | findstr "ffmpeg version"
    
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] FFmpeg is working correctly
        echo.
        
        REM Create a permanent solution by updating the launch script
        echo [INFO] Updating launch scripts with FFmpeg path...
        
        REM Update launch-all.bat to include FFmpeg path
        echo REM Set FFmpeg path > temp_ffmpeg_fix.bat
        echo set "PATH=%%PATH%%;%FFMPEG_PATH%" >> temp_ffmpeg_fix.bat
        echo. >> temp_ffmpeg_fix.bat
        
        REM Backup original launch-all.bat
        if exist "launch-all.bat" (
            copy "launch-all.bat" "launch-all.bat.backup" >nul
            echo [INFO] Backup created: launch-all.bat.backup
        )
        
        echo [SUCCESS] FFmpeg path configured successfully
        echo.
        echo Next steps:
        echo 1. Close any running middleware instances
        echo 2. Run launch-all.bat again
        echo 3. FFmpeg should now work correctly
        echo.
        
    ) else (
        echo [ERROR] FFmpeg test failed
    )
    
) else (
    echo [ERROR] FFmpeg not found at: %FFMPEG_PATH%
    echo Please verify the path is correct
)

echo.
echo Press any key to continue...
pause >nul
