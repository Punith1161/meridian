#!/usr/bin/env bash
# ============================================================
#  MERIDIAN — Start both backend and frontend
#  Usage: bash start.sh [--prod]
# ============================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
VENV_DIR="$BACKEND_DIR/venv"
PROD=false

for arg in "$@"; do
  case $arg in
    --prod) PROD=true ;;
  esac
done

# Activate Python venv
if [ ! -d "$VENV_DIR" ]; then
  echo "[MERIDIAN] Run ./setup.sh first"
  exit 1
fi
source "$VENV_DIR/bin/activate"

# Force-free ports before starting
free_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "[MERIDIAN] Freeing port $port (PIDs: $pids)..."
    kill -9 $pids 2>/dev/null || true
    sleep 0.5
  fi
}

free_port 8000
free_port 5173

cleanup() {
  echo ""
  echo "[MERIDIAN] Shutting down..."
  kill 0
}
trap cleanup EXIT INT TERM

echo "[MERIDIAN] Starting backend on :8000..."
cd "$BACKEND_DIR"
if $PROD; then
  uvicorn app.main:app --host 127.0.0.1 --port 8000 &
else
  uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
fi
BACKEND_PID=$!

# Wait for backend
echo "[MERIDIAN] Waiting for backend..."
for i in {1..30}; do
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "[MERIDIAN] Backend ready ✓"
    break
  fi
  sleep 0.5
done

echo "[MERIDIAN] Starting frontend on :5173..."
cd "$FRONTEND_DIR"
if $PROD; then
  npm run build && npm run preview &
else
  npm run dev &
fi
FRONTEND_PID=$!

echo ""
echo "[MERIDIAN] Running!"
echo "  → App:     http://localhost:5173"
echo "  → API:     http://localhost:8000"
echo "  → API docs: http://localhost:8000/api/docs"
echo ""
echo "Press Ctrl+C to stop"
wait
