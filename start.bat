@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Config Studio v2.0 Beta

:: ---------------------------------------------------------
:: Config Studio v2.0 Startup & Launcher
:: Supports Multi-Root Workspaces, PWA TLS, Dual-Editions
:: ---------------------------------------------------------

:: 1. Default Parameters
set "PORT=8080"
set "WORKDIR=%~dp0."
set "DATADIR=%~dp0data"
set "USE_TLS=1"
set "OPEN_BROWSER=1"
set "LANG_PREF="
set "EXTRA_ARGS="

:: 2. Parse Command Line Arguments
:parse_args
if "%~1"=="" goto after_args

if /i "%~1"=="--help" goto show_help
if /i "%~1"=="-h" goto show_help
if /i "%~1"=="/?" goto show_help
if /i "%~1"=="-?" goto show_help

if /i "%~1"=="--notls" (
    set "USE_TLS=0"
    shift
    goto parse_args
)
if /i "%~1"=="--http" (
    set "USE_TLS=0"
    shift
    goto parse_args
)
if /i "%~1"=="--tls" (
    set "USE_TLS=1"
    shift
    goto parse_args
)
if /i "%~1"=="--https" (
    set "USE_TLS=1"
    shift
    goto parse_args
)
if /i "%~1"=="--nobrowser" (
    set "OPEN_BROWSER=0"
    shift
    goto parse_args
)
if /i "%~1"=="--no-browser" (
    set "OPEN_BROWSER=0"
    shift
    goto parse_args
)
if /i "%~1"=="--headless" (
    set "OPEN_BROWSER=0"
    shift
    goto parse_args
)
if /i "%~1"=="--ru" (
    set "LANG_PREF=ru"
    shift
    goto parse_args
)
if /i "%~1"=="--en" (
    set "LANG_PREF=en"
    shift
    goto parse_args
)
if /i "%~1"=="--port" (
    set "PORT=%~2"
    shift
    shift
    goto parse_args
)
if /i "%~1"=="-port" (
    set "PORT=%~2"
    shift
    shift
    goto parse_args
)
if /i "%~1"=="-p" (
    set "PORT=%~2"
    shift
    shift
    goto parse_args
)
if /i "%~1"=="--workdir" (
    set "WORKDIR=%~2"
    shift
    shift
    goto parse_args
)
if /i "%~1"=="-workdir" (
    set "WORKDIR=%~2"
    shift
    shift
    goto parse_args
)
if /i "%~1"=="--data" (
    set "DATADIR=%~2"
    shift
    shift
    goto parse_args
)
if /i "%~1"=="-data" (
    set "DATADIR=%~2"
    shift
    shift
    goto parse_args
)

:: Forward all other flags
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto parse_args

:after_args

:: 3. Select Executable based on Language Preference
set "EXE="
if "!LANG_PREF!"=="en" (
    set "CANDIDATES=config-studio-en-windows-amd64.exe config-studio-windows-amd64.exe config-studio-ru-windows-amd64.exe config-studio.exe"
) else (
    set "CANDIDATES=config-studio-ru-windows-amd64.exe config-studio-windows-amd64.exe config-studio-en-windows-amd64.exe config-studio.exe config-editor-windows-amd64.exe"
)

for %%F in (!CANDIDATES!) do (
    if not defined EXE if exist "%~dp0%%~F" set "EXE=%~dp0%%~F"
    if not defined EXE if exist "%~dp0bin\%%~F" set "EXE=%~dp0bin\%%~F"
)

if not defined EXE (
    echo ========================================================
    echo  [ERROR] Config Studio executable not found in %~dp0
    echo ========================================================
    echo  Please make sure config-studio-ru-windows-amd64.exe or
    echo  config-studio-windows-amd64.exe exists in this folder
    echo  or in the 'bin\' subfolder.
    echo.
    echo  To build the project, run: powershell scripts\build.ps1
    echo ========================================================
    echo.
    pause
    exit /b 1
)

:: 4. Ensure Data Directory Exists
if not exist "!DATADIR!" mkdir "!DATADIR!" 2>nul

:: 5. Multi-Root Workspaces status check
set "WS_STATUS=Initial (will auto-create workspaces.yaml from workdir)"
if exist "!DATADIR!\workspaces.yaml" (
    set "WS_STATUS=Active (loaded from !DATADIR!\workspaces.yaml)"
)

:: 6. TLS / HTTPS Configuration
set "MODE_LABEL=HTTP (Run without --http for PWA/TLS)"
if "!USE_TLS!"=="1" (
    set "SCHEME=https"
    set "TLS_FLAG=--tls"
    set "MODE_LABEL=HTTPS / TLS (PWA Ready for Mobile and LAN)"
) else (
    set "SCHEME=http"
    set "TLS_FLAG="
    set "MODE_LABEL=HTTP (Plain unencrypted)"
)

:: 7. Detect Local Network IP Address
set "LOCAL_IP="
for /f "tokens=4" %%I in ('route print 0.0.0.0 2^>nul ^| find " 0.0.0.0 "') do (
    if not defined LOCAL_IP if not "%%I"=="0.0.0.0" set "LOCAL_IP=%%I"
)

echo ========================================================
echo   Config Studio v2.0 (Beta) - Mobile PWA ^& Multi-Root
echo ========================================================
echo   Binary:      !EXE!
echo   Workdir:     !WORKDIR!
echo   Data Dir:    !DATADIR!
echo   Workspaces:  !WS_STATUS!
echo   Local URL:   !SCHEME!://localhost:!PORT!
if defined LOCAL_IP (
echo   Network URL: !SCHEME!://!LOCAL_IP!:!PORT!
)
echo   Mode:        !MODE_LABEL!
echo ========================================================
if defined LOCAL_IP if "!USE_TLS!"=="1" (
echo   [Tip] To install on Phone/Tablet: open Network URL in
echo         mobile browser and tap "Install" / "Add to Home Screen".
echo ========================================================
)
echo.

:: 8. Launch Browser (if enabled)
if "!OPEN_BROWSER!"=="1" (
    start "" cmd /c "timeout /t 2 /nobreak >nul & start !SCHEME!://localhost:!PORT!"
)

:: 9. Run Config Studio Server
"!EXE!" -workdir "!WORKDIR!" -data "!DATADIR!" -port !PORT! !TLS_FLAG! !EXTRA_ARGS!

if errorlevel 1 (
    echo.
    echo ========================================================
    echo  Config Studio server stopped with exit code %ERRORLEVEL%.
    echo ========================================================
    pause
)
exit /b %ERRORLEVEL%

:show_help
echo ========================================================
echo   Config Studio v2.0 - Startup Launcher Reference
echo ========================================================
echo.
echo Usage:
echo   start.bat [options] [extra flags]
echo.
echo Options:
echo   --notls, --http          Run in plain HTTP mode (disables HTTPS)
echo   --tls, --https           Run in HTTPS mode (default, required for Mobile PWA)
echo   --port ^<num^>, -p ^<num^>   Port to listen on (default: 8080)
echo   --ru                     Prefer Russian UI edition
echo   --en                     Prefer English UI edition
echo   --nobrowser, --headless  Do not open the web browser automatically
echo   --workdir ^<path^>         Working directory for configs (default: current folder)
echo   --data ^<path^>            Data directory for settings, logs, secrets (default: .\data)
echo   --help, -h, /?           Show this help reference
echo.
echo Multi-Root Workspaces:
echo   Multiple folders can be mounted and edited simultaneously.
echo   Configured via YAML in '.\data\workspaces.yaml' or in the UI.
echo ========================================================
echo.
pause
exit /b 0
