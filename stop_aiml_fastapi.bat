@echo off
setlocal EnableDelayedExpansion
set "QUIET=%~1"

echo [INFO] Looking for AIML FastAPI on port 8000...
set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:"127.0.0.1:8000 .*LISTENING" /C:"0.0.0.0:8000 .*LISTENING"') do (
    set "PORT_PID=%%P"
)

if not defined PORT_PID (
    echo [INFO] No process is listening on port 8000.
    if /I not "%QUIET%"=="--quiet" pause
    exit /b 0
)

echo [INFO] Stopping process on port 8000 ^(PID !PORT_PID!^)...
taskkill /PID !PORT_PID! /F

echo [INFO] Done.
if /I not "%QUIET%"=="--quiet" pause
