@echo off
setlocal EnableDelayedExpansion

set "ROOT_DIR=%~dp0"
set "AIML_DIR=%ROOT_DIR%AIML"
set "VENV_PY=%AIML_DIR%\.venv\Scripts\python.exe"

if not exist "%AIML_DIR%\main.py" (
    echo [ERROR] Could not find AIML\main.py
    echo Make sure this bat file stays in the project root.
    pause
    exit /b 1
)

cd /d "%AIML_DIR%"

echo [INFO] Checking whether AIML FastAPI is already running...
powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 3; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel%==0 (
    echo [INFO] AIML FastAPI is already running on http://127.0.0.1:8000
    echo [INFO] Health check: http://127.0.0.1:8000/health
    echo [INFO] You can use the app now. No need to start another copy.
    pause
    exit /b 0
)

if exist "%VENV_PY%" goto run_api

echo [INFO] Creating local virtual environment...
where py >nul 2>nul
if %errorlevel%==0 (
    py -3 -m venv .venv
) else (
    python -m venv .venv
)

if not exist "%VENV_PY%" (
    echo [ERROR] Failed to create .venv
    pause
    exit /b 1
)

echo [INFO] Installing AIML requirements...
"%VENV_PY%" -m pip install --upgrade pip
"%VENV_PY%" -m pip install -r requirements.txt

:run_api
set "PORT_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:"127.0.0.1:8000 .*LISTENING" /C:"0.0.0.0:8000 .*LISTENING"') do (
    set "PORT_PID=%%P"
)

if defined PORT_PID (
    echo [ERROR] Port 8000 is already being used by PID !PORT_PID!
    echo [ERROR] Close that process or free port 8000, then run this file again.
    echo [INFO] If it is your existing AIML server, just keep using it.
    pause
    exit /b 1
)

echo.
echo [INFO] Starting Invigo AIML FastAPI on http://127.0.0.1:8000
echo [INFO] Health check: http://127.0.0.1:8000/health
echo [INFO] Keep this window open while using the app.
echo.

"%VENV_PY%" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

echo.
echo [INFO] AIML server stopped.
pause
