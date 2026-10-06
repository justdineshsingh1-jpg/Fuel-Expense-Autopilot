@echo off
echo ========================================================
echo FUEL EXPENSE AUTOPILOT - NATIVE APK BUILD AUTOMATION
echo ========================================================
echo.

REM Set isolated environment variables to prevent conflicts
set "JAVA_HOME=C:\openjdk\jdk-17.0.11+9"
set "ANDROID_HOME=C:\android_sdk"
set "FLUTTER_BIN=C:\flutter\bin\flutter.bat"

REM Navigate to the mobile directory
cd /d "%~dp0mobile"

echo [1/3] Cleaning previous build artifacts...
call "%FLUTTER_BIN%" clean

echo.
echo [2/3] Fetching latest dependencies...
call "%FLUTTER_BIN%" pub get

echo.
echo [3/3] Compiling highly-optimized Split APKs (arm64 and armeabi)...
echo This will take 2-3 minutes. Please wait...
call "%FLUTTER_BIN%" build apk --split-per-abi

echo.
echo ========================================================
if %errorlevel% equ 0 (
    echo BUILD SUCCESSFUL!
    echo.
    echo Running Cloud Uploader to generate your download link...
    cd /d "%~dp0web"
    node upload_apk.js
) else (
    echo BUILD FAILED! Check the console output above for errors.
)
echo ========================================================
pause
