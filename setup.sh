#!/usr/bin/env bash
# ============================================================
#  MERIDIAN — Linux/macOS one-command setup
#  Usage:  bash setup.sh
# ============================================================

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
VENV_DIR="$BACKEND_DIR/.venv"

log()     { echo -e "${CYAN}[MERIDIAN]${RESET} $*"; }
success() { echo -e "${GREEN}[MERIDIAN] ✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}[MERIDIAN] ⚠${RESET} $*"; }
fail()    { echo -e "${RED}[MERIDIAN] ✗${RESET} $*"; exit 1; }

echo -e "${BOLD}"
echo "  ███╗   ███╗███████╗██████╗ ██╗██████╗ ██╗ █████╗ ███╗   ██╗"
echo "  ████╗ ████║██╔════╝██╔══██╗██║██╔══██╗██║██╔══██╗████╗  ██║"
echo "  ██╔████╔██║█████╗  ██████╔╝██║██║  ██║██║███████║██╔██╗ ██║"
echo "  ██║╚██╔╝██║██╔══╝  ██╔══██╗██║██║  ██║██║██╔══██║██║╚██╗██║"
echo "  ██║ ╚═╝ ██║███████╗██║  ██║██║██████╔╝██║██║  ██║██║ ╚████║"
echo "  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝╚═╝╚═════╝ ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝"
echo -e "${RESET}"
echo "  Local-first personal productivity workspace"
echo "  Setup script v1.0"
echo ""

# ── 1. Check Python ────────────────────────────────────────────────────────────
log "Checking Python..."
PYTHON=""
for cmd in python3.12 python3.11 python3 python; do
  if command -v "$cmd" &>/dev/null; then
    VER=$("$cmd" -c "import sys; print(sys.version_info[:2])" 2>/dev/null || echo "(0, 0)")
    MAJOR=$(echo "$VER" | tr -d '()' | cut -d',' -f1 | tr -d ' ')
    MINOR=$(echo "$VER" | tr -d '()' | cut -d',' -f2 | tr -d ' ')
    if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 11 ]; then
      PYTHON="$cmd"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  fail "Python 3.11+ not found. Install from https://python.org or via your package manager."
fi
success "Python: $($PYTHON --version)"

# ── 2. Check Node ──────────────────────────────────────────────────────────────
log "Checking Node.js..."
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install from https://nodejs.org (LTS recommended)"
fi
NODE_VER=$(node --version | tr -d 'v' | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  fail "Node.js 18+ required. Current: $(node --version)"
fi
success "Node.js: $(node --version)"

# ── 3. Check npm ───────────────────────────────────────────────────────────────
log "Checking npm..."
if ! command -v npm &>/dev/null; then
  fail "npm not found. It should come with Node.js."
fi
success "npm: $(npm --version)"

# ── 4. Python virtual environment ─────────────────────────────────────────────
log "Setting up Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
  "$PYTHON" -m venv "$VENV_DIR"
  success "Virtual environment created at $VENV_DIR"
else
  warn "Virtual environment already exists, skipping creation"
fi

# Activate venv
source "$VENV_DIR/bin/activate"

log "Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r "$BACKEND_DIR/requirements.txt" -q
success "Python dependencies installed"

# ── 5. Backend .env ────────────────────────────────────────────────────────────
log "Configuring backend..."
ENV_FILE="$BACKEND_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$BACKEND_DIR/.env.example" "$ENV_FILE"
  # Generate a real SECRET_KEY
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  sed -i.bak "s/PLACEHOLDER_REPLACED_BY_SETUP_SCRIPT/$SECRET/" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  success "Created .env with generated SECRET_KEY"
else
  warn ".env already exists, skipping"
fi

# ── 6. Frontend dependencies ───────────────────────────────────────────────────
log "Installing frontend dependencies (this may take a minute)..."
cd "$FRONTEND_DIR"
npm install --silent
success "Frontend dependencies installed"

# ── 7. VS Code workspace settings ─────────────────────────────────────────────
log "Creating VS Code workspace settings..."
mkdir -p "$REPO_ROOT/.vscode"
cat > "$REPO_ROOT/.vscode/settings.json" << 'VSCODE'
{
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/.venv/bin/python",
  "python.terminal.activateEnvironment": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
VSCODE

cat > "$REPO_ROOT/.vscode/launch.json" << 'LAUNCH'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "MERIDIAN Backend",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
      "cwd": "${workspaceFolder}/backend",
      "envFile": "${workspaceFolder}/backend/.env",
      "console": "integratedTerminal"
    },
    {
      "name": "MERIDIAN Frontend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/frontend",
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "MERIDIAN Full Stack",
      "configurations": ["MERIDIAN Backend", "MERIDIAN Frontend"],
      "stopAll": true
    }
  ]
}
LAUNCH
success "VS Code workspace settings created"

# ── 8. Summary ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════╗"
echo -e "║   MERIDIAN setup complete! 🎉          ║"
echo -e "╚════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${BOLD}To start the app:${RESET}"
echo ""
echo -e "  ${CYAN}Terminal 1 — Backend:${RESET}"
echo "    cd backend"
echo "    source .venv/bin/activate"
echo "    uvicorn app.main:app --reload"
echo ""
echo -e "  ${CYAN}Terminal 2 — Frontend:${RESET}"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo -e "  ${CYAN}Then open:${RESET} http://localhost:5173"
echo ""
echo -e "  ${CYAN}VS Code one-click:${RESET}"
echo "    Open Run & Debug → select 'MERIDIAN Full Stack' → press ▶"
echo ""
echo -e "  ${CYAN}API docs:${RESET} http://localhost:8000/api/docs"
echo ""
