@echo off
title SCTE-35 Middleware Setup Validation
color 0E

echo.
echo ========================================
echo   SCTE-35 Middleware Setup Validation
echo ========================================
echo.

set "VALIDATION_PASSED=0"
set "VALIDATION_FAILED=0"

REM Function to print success
:print_success
echo [PASS] %~1
set /a VALIDATION_PASSED+=1
goto :eof

REM Function to print failure
:print_failure
echo [FAIL] %~1
set /a VALIDATION_FAILED+=1
goto :eof

REM Function to print info
:print_info
echo [INFO] %~1
goto :eof

echo Checking system requirements...
echo.

REM Check Node.js
call :print_info "Checking Node.js installation..."
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
    call :print_success "Node.js found: !NODE_VERSION!"
) else (
    call :print_failure "Node.js not found in PATH"
    echo          Download from: https://nodejs.org/
)

REM Check FFmpeg
call :print_info "Checking FFmpeg installation..."
where ffmpeg >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('ffmpeg -version 2^>nul ^| findstr "ffmpeg version"') do set FFMPEG_VERSION=%%i
    call :print_success "FFmpeg found: !FFMPEG_VERSION!"
    
    REM Check SCTE-35 support
    ffmpeg -filters 2>nul | findstr "scte35" >nul
    if %ERRORLEVEL% EQU 0 (
        call :print_success "FFmpeg SCTE-35 support detected"
    ) else (
        call :print_failure "FFmpeg SCTE-35 support not detected"
        echo          Please ensure you have a recent FFmpeg build with SCTE-35 support
    )
) else (
    call :print_failure "FFmpeg not found in PATH"
    echo          Download from: https://ffmpeg.org/download.html
)

echo.
echo Checking project structure...
echo.

REM Check project directories
if exist "server" (
    call :print_success "Server directory found"
) else (
    call :print_failure "Server directory missing"
)

if exist "ui" (
    call :print_success "UI directory found"
) else (
    call :print_failure "UI directory missing"
)

if exist "server\server.js" (
    call :print_success "Main server file found"
) else (
    call :print_failure "Main server file missing"
)

if exist "server\package.json" (
    call :print_success "Package.json found"
) else (
    call :print_failure "Package.json missing"
)

if exist "ui\index.html" (
    call :print_success "Web UI found"
) else (
    call :print_failure "Web UI missing"
)

if exist "ui\styles.css" (
    call :print_success "UI styles found"
) else (
    call :print_failure "UI styles missing"
)

echo.
echo Checking Node.js dependencies...
echo.

if exist "server\node_modules" (
    call :print_success "Node modules directory found"
    
    REM Check specific dependencies
    if exist "server\node_modules\express" (
        call :print_success "Express.js dependency found"
    ) else (
        call :print_failure "Express.js dependency missing"
        echo          Run: cd server && npm install express
    )
    
    if exist "server\node_modules\cors" (
        call :print_success "CORS dependency found"
    ) else (
        call :print_failure "CORS dependency missing"
        echo          Run: cd server && npm install cors
    )
) else (
    call :print_failure "Node modules not installed"
    echo          Run: cd server && npm install
)

echo.
echo Checking network ports...
echo.

REM Check if ports are available
netstat -an | findstr ":1935" >nul
if %ERRORLEVEL% EQU 0 (
    call :print_failure "Port 1935 (RTMP) is already in use"
    echo          Stop any applications using this port
) else (
    call :print_success "Port 1935 (RTMP) is available"
)

netstat -an | findstr ":3000" >nul
if %ERRORLEVEL% EQU 0 (
    call :print_failure "Port 3000 (API/UI) is already in use"
    echo          Stop any applications using this port
) else (
    call :print_success "Port 3000 (API/UI) is available"
)

netstat -an | findstr ":1234" >nul
if %ERRORLEVEL% EQU 0 (
    call :print_failure "Port 1234 (SRT Output) is already in use"
    echo          This may conflict with Flussonic input
) else (
    call :print_success "Port 1234 (SRT Output) is available"
)

echo.
echo Testing basic functionality...
echo.

REM Test Node.js server startup (quick test)
if exist "server\server.js" (
    call :print_info "Testing server startup..."
    cd server
    timeout /t 3 /nobreak >nul 2>&1 & node -c server.js >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        call :print_success "Server syntax validation passed"
    ) else (
        call :print_failure "Server syntax validation failed"
        echo          Check server.js for syntax errors
    )
    cd ..
)

REM Test FFmpeg basic functionality
call :print_info "Testing FFmpeg basic functionality..."
ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 -f null - >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call :print_success "FFmpeg basic test passed"
) else (
    call :print_failure "FFmpeg basic test failed"
)

echo.
echo Checking Windows Firewall (requires admin rights)...
echo.

REM Check Windows Firewall (this may require admin rights)
netsh advfirewall show allprofiles state >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call :print_info "Windows Firewall status check (may need admin rights)"
    for /f "tokens=3" %%i in ('netsh advfirewall show allprofiles state ^| findstr "State"') do (
        if "%%i"=="ON" (
            call :print_failure "Windows Firewall is enabled - may block connections"
            echo          Consider adding firewall rules for ports 1935, 3000, 1234
        ) else (
            call :print_success "Windows Firewall is disabled"
        )
    )
) else (
    call :print_info "Cannot check Windows Firewall status (admin rights required)"
)

echo.
echo Validation Summary:
echo ========================================
echo.
echo Tests Passed: %VALIDATION_PASSED%
echo Tests Failed: %VALIDATION_FAILED%
echo.

if %VALIDATION_FAILED% EQU 0 (
    echo [SUCCESS] All validations passed!
    echo Your SCTE-35 Middleware setup appears to be ready.
    echo.
    echo Next steps:
    echo 1. Configure your OBS streams
    echo 2. Set up Flussonic configuration
    echo 3. Run start.bat to launch the middleware
    echo 4. Access web UI at http://localhost:3000
) else (
    echo [WARNING] %VALIDATION_FAILED% validation(s) failed.
    echo Please address the failed items before running the middleware.
    echo.
    echo Common solutions:
    echo - Install missing dependencies: cd server && npm install
    echo - Download and install Node.js and FFmpeg
    echo - Check port availability and firewall settings
    echo - Verify all project files are present
)

echo.
echo Additional Checks:
echo ========================================
echo.

REM Check OBS Studio (optional)
call :print_info "Checking for OBS Studio..."
if exist "C:\Program Files\obs-studio\bin\64bit\obs64.exe" (
    call :print_success "OBS Studio found (64-bit)"
) else if exist "C:\Program Files (x86)\obs-studio\bin\32bit\obs32.exe" (
    call :print_success "OBS Studio found (32-bit)"
) else (
    call :print_info "OBS Studio not found in default location"
    echo          This is optional - install from https://obsproject.com/
)

REM Check system resources
call :print_info "Checking system resources..."
for /f "skip=1" %%i in ('wmic computersystem get TotalPhysicalMemory') do (
    if not "%%i"=="" (
        set /a RAM_GB=%%i/1024/1024/1024
        if !RAM_GB! GEQ 4 (
            call :print_success "System RAM: !RAM_GB!GB (sufficient)"
        ) else (
            call :print_failure "System RAM: !RAM_GB!GB (4GB+ recommended)"
        )
        goto :ram_done
    )
)
:ram_done

REM Check CPU cores
for /f "skip=1" %%i in ('wmic cpu get NumberOfCores') do (
    if not "%%i"=="" (
        call :print_success "CPU Cores: %%i"
        goto :cpu_done
    )
)
:cpu_done

echo.
echo Configuration Recommendations:
echo ========================================
echo.
echo OBS Settings:
echo - Output Mode: Advanced
echo - Type: Custom Output (FFmpeg)
echo - URL: rtmp://localhost:1935/live/stream1
echo - Container: flv
echo - Video Encoder: libx264
echo - Audio Encoder: aac
echo - Keyframe Interval: 2 seconds
echo.
echo Flussonic Settings:
echo - Input: srt://localhost:1234?streamid=stream1
echo - SCTE-35 PID: 500
echo - Packet Size: 1316 bytes
echo.
echo Network Settings:
echo - Ensure ports 1935, 3000, 1234 are open
echo - Configure Windows Firewall if needed
echo - Use wired connection for stability
echo.

echo Press any key to exit...
pause >nul
