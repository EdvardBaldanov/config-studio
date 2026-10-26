@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:: 1. Search for Config Studio executable
set "EXE="
for %%F in (
    "config-studio-ru-windows-amd64.exe"
    "config-studio-windows-amd64.exe"
    "config-studio-en-windows-amd64.exe"
    "config-studio.exe"
    "config-editor-windows-amd64.exe"
    "config-editor.exe"
) do (
    if not defined EXE if exist "%%~F" set "EXE=%%~F"
)

if not defined EXE (
    echo [ERROR] Config Studio executable not found in %~dp0
    echo Please make sure config-studio-ru-windows-amd64.exe or config-studio-windows-amd64.exe is in this folder.
    echo.
    pause
    exit /b 1
)

:: 2. Configuration Settings
set "PORT=8080"
set "WORKDIR=%~dp0."
set "DATADIR=%~dp0data"

:: TLS Mode: Set to 1 to enable HTTPS (required for Mobile PWA installation over LAN), or 0 for standard HTTP
set "USE_TLS=1"

:: Check command-line arguments for override
for %%A in (%*) do (
    if /i "%%~A"=="--notls" set "USE_TLS=0"
    if /i "%%~A"=="--http"  set "USE_TLS=0"
    if /i "%%~A"=="--tls"   set "USE_TLS=1"
    if /i "%%~A"=="--https" set "USE_TLS=1"
)

if "!USE_TLS!"=="1" (
    set "SCHEME=https"
    set "TLS_FLAG=--tls"
) else (
    set "SCHEME=http"
    set "TLS_FLAG="
)

:: Find local network IP address
for /f "tokens=4" %%I in ('route print 0.0.0.0 2^>nul ^| findstr /c:" 0.0.0.0 "') do (
    if not defined LOCAL_IP if not "%%I"=="0.0.0.0" set "LOCAL_IP=%%I"
)

echo ========================================================
echo  Config Studio
echo ========================================================
echo  Executable:  !EXE!
echo  Working Dir: !WORKDIR!
echo  Data Dir:    !DATADIR!
echo  Local URL:   !SCHEME!://localhost:!PORT!
if defined LOCAL_IP (
echo  Network URL: !SCHEME!://!LOCAL_IP!:!PORT!
)
if "!USE_TLS!"=="1" (
echo  Mode:        HTTPS / TLS (PWA Ready)
) else (
echo  Mode:        HTTP (Run with --tls for PWA)
)
echo ========================================================
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul & start !SCHEME!://localhost:!PORT!"
"!EXE!" -workdir "!WORKDIR!" -data "!DATADIR!" -port !PORT! !TLS_FLAG!

if errorlevel 1 pause
