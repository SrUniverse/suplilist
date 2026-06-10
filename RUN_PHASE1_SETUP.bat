@echo off
REM SupliList FASE 1 - Setup Script Launcher
REM Double-click this file to run the setup automatically

setlocal enabledelayedexpansion

REM Change to the suplilist directory
cd /d "%~dp0"

REM Check if PowerShell exists
where powershell >nul 2>nul
if errorlevel 1 (
    color 4F
    echo.
    echo ========================================
    echo ERROR: PowerShell not found!
    echo ========================================
    echo.
    echo Please install Windows PowerShell or use PowerShell 7+
    echo.
    pause
    exit /b 1
)

REM Check if phase1-setup.ps1 exists
if not exist "phase1-setup.ps1" (
    color 4F
    echo.
    echo ========================================
    echo ERROR: phase1-setup.ps1 not found!
    echo ========================================
    echo.
    echo Make sure you're in the correct directory:
    echo C:\Users\User\Desktop\suplilist
    echo.
    pause
    exit /b 1
)

REM Run the PowerShell script
color 2F
echo.
echo ========================================
echo SupliList FASE 1 - Setup Starting
echo ========================================
echo.
echo Launching PowerShell script...
echo.

powershell.exe -ExecutionPolicy Bypass -NoExit -File "phase1-setup.ps1"

REM Check exit code
if errorlevel 1 (
    color 4F
    echo.
    echo Setup completed with errors. Check output above.
    echo.
) else (
    color 2F
    echo.
    echo Setup completed successfully!
    echo.
)

pause
exit /b %errorlevel%
