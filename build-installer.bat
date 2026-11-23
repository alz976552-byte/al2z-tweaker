@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo.
echo ================================================================
echo    Al2zTweaker - Automatic installer builder
echo ================================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Download and install Node.js 18 or newer: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Cleaning previous builds...
if exist "dist" rmdir /s /q dist 2>nul
if exist "node_modules\electron" rmdir /s /q node_modules\electron 2>nul
if exist "package-lock.json" del /f /q package-lock.json 2>nul

echo [2/5] Setting working Electron mirrors...
set ELECTRON_MIRROR=https://registry.npmmirror.com/-/binary/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://registry.npmmirror.com/-/binary/electron-builder-binaries/

echo [3/5] Installing dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo Checking Electron binary...
if not exist "node_modules\electron\dist\electron.exe" (
    echo Downloading Electron binary manually...
    call npm install-scripts approve electron >nul 2>&1
    node node_modules\electron\install.js
)
if not exist "node_modules\electron\dist\electron.exe" (
    echo Extracting cached Electron archive...
    powershell -NoProfile -ExecutionPolicy Bypass -File "fix-electron.ps1"
)
if not exist "node_modules\electron\dist\electron.exe" (
    echo [ERROR] Electron binary could not be installed.
    pause
    exit /b 1
)

echo Installing symlink-safe 7-Zip wrapper...
powershell -NoProfile -ExecutionPolicy Bypass -File "fix-7za.ps1"

echo [4/5] Building NSIS installer...
call npm run dist
if errorlevel 1 (
    echo [ERROR] Build failed! Check the log above.
    pause
    exit /b 1
)

echo [5/5] Done!
echo.
echo ================================================================
if exist "dist\Al2zTweaker Setup 1.0.0.exe" (
    echo [SUCCESS] Installer created:
    echo    dist\Al2zTweaker Setup 1.0.0.exe
    for %%F in ("dist\Al2zTweaker Setup 1.0.0.exe") do echo Size: %%~zF bytes
) else (
    echo [WARNING] Installer not found in dist\. Check the folder manually.
)
echo.
echo Installer language: English
echo Features: UWP removal, Win32 uninstall, tweaks, presets, monitoring
echo Run the installer as Administrator.
echo.
pause
