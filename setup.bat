@echo off
:: ============================================================
::  MERIDIAN — Windows one-command setup
::  Usage: Double-click setup.bat  OR  run from cmd/PowerShell
:: ============================================================
setlocal enabledelayedexpansion

title MERIDIAN Setup

echo.
echo   M E R I D I A N   S E T U P
echo   ============================
echo   Local-first personal productivity workspace
echo.

set REPO_ROOT=%~dp0
set BACKEND_DIR=%REPO_ROOT%backend
set FRONTEND_DIR=%REPO_ROOT%frontend
set VENV_DIR=%BACKEND_DIR%\.venv

:: ── 1. Check Python ────────────────────────────────────────────────────────────
echo [1/6] Checking Python...

set PYTHON=
for %%P in (python3.12 python3.11 python3 python py) do (
    where %%P >nul 2>&1
    if !errorlevel! == 0 (
        for /f "tokens=2" %%V in ('%%P --version 2^>^&1') do (
            for /f "tokens=1,2 delims=." %%A in ("%%V") do (
                if %%A GEQ 3 if %%B GEQ 11 (
                    set PYTHON=%%P
                )
            )
        )
    )
    if defined PYTHON goto :python_found
)

echo [ERROR] Python 3.11+ not found.
echo         Install from: https://python.org
echo         Make sure to check "Add Python to PATH" during installation
pause
exit /b 1

:python_found
echo [OK] Python: found

:: ── 2. Check Node.js ───────────────────────────────────────────────────────────
echo [2/6] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo         Install from: https://nodejs.org (LTS version)
    pause
    exit /b 1
)

for /f "tokens=1" %%V in ('node --version') do (
    set NODE_VER=%%V
)
echo [OK] Node.js: %NODE_VER%

:: ── 3. Python virtual environment ─────────────────────────────────────────────
echo [3/6] Setting up Python virtual environment...

if not exist "%VENV_DIR%" (
    %PYTHON% -m venv "%VENV_DIR%"
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment already exists
)

call "%VENV_DIR%\Scripts\activate.bat"

echo Installing Python dependencies...
pip install --upgrade pip -q
pip install -r "%BACKEND_DIR%\requirements.txt" -q
echo [OK] Python dependencies installed

:: ── 4. Backend .env ────────────────────────────────────────────────────────────
echo [4/6] Configuring backend...

if not exist "%BACKEND_DIR%\.env" (
    copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
    :: Generate SECRET_KEY using Python
    for /f %%K in ('%PYTHON% -c "import secrets; print(secrets.token_hex(32))"') do (
        set SECRET_KEY=%%K
    )
    :: Replace placeholder in .env using PowerShell
    powershell -Command "(Get-Content '%BACKEND_DIR%\.env') -replace 'PLACEHOLDER_REPLACED_BY_SETUP_SCRIPT', '%SECRET_KEY%' | Set-Content '%BACKEND_DIR%\.env'"
    echo [OK] Created .env with generated SECRET_KEY
) else (
    echo [OK] .env already exists, skipping
)

:: ── 5. Frontend dependencies ───────────────────────────────────────────────────
echo [5/6] Installing frontend dependencies (this may take a minute)...
cd /d "%FRONTEND_DIR%"
call npm install --silent
if errorlevel 1 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

:: ── 6. VS Code settings ────────────────────────────────────────────────────────
echo [6/6] Creating VS Code workspace settings...
if not exist "%REPO_ROOT%.vscode" mkdir "%REPO_ROOT%.vscode"

(
echo {
echo   "python.defaultInterpreterPath": "${workspaceFolder}/backend/.venv/Scripts/python.exe",
echo   "python.terminal.activateEnvironment": true,
echo   "editor.formatOnSave": true,
echo   "editor.defaultFormatter": "esbenp.prettier-vscode"
echo }
) > "%REPO_ROOT%.vscode\settings.json"

(
echo {
echo   "version": "0.2.0",
echo   "configurations": [
echo     {
echo       "name": "MERIDIAN Backend",
echo       "type": "python",
echo       "request": "launch",
echo       "module": "uvicorn",
echo       "args": ["app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
echo       "cwd": "${workspaceFolder}/backend",
echo       "envFile": "${workspaceFolder}/backend/.env",
echo       "console": "integratedTerminal"
echo     },
echo     {
echo       "name": "MERIDIAN Frontend",
echo       "type": "node",
echo       "request": "launch",
echo       "runtimeExecutable": "npm",
echo       "runtimeArgs": ["run", "dev"],
echo       "cwd": "${workspaceFolder}/frontend",
echo       "console": "integratedTerminal"
echo     }
echo   ],
echo   "compounds": [
echo     {
echo       "name": "MERIDIAN Full Stack",
echo       "configurations": ["MERIDIAN Backend", "MERIDIAN Frontend"],
echo       "stopAll": true
echo     }
echo   ]
echo }
) > "%REPO_ROOT%.vscode\launch.json"
echo [OK] VS Code workspace settings created

:: ── Done ───────────────────────────────────────────────────────────────────────
echo.
echo ╔═══════════════════════════════════════╗
echo ║  MERIDIAN setup complete!             ║
echo ╚═══════════════════════════════════════╝
echo.
echo To start the app:
echo.
echo   Terminal 1 - Backend:
echo     cd backend
echo     .venv\Scripts\activate
echo     uvicorn app.main:app --reload
echo.
echo   Terminal 2 - Frontend:
echo     cd frontend
echo     npm run dev
echo.
echo   Then open: http://localhost:5173
echo.
echo   VS Code one-click:
echo     Open Run ^& Debug
echo     Select 'MERIDIAN Full Stack' and press F5
echo.
echo   API docs: http://localhost:8000/api/docs
echo.
pause
