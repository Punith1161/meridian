#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/Meridian-Code-Flow/Meridian-Code-Flow/artifacts/meridian"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-4173}"
BASE_PATH="${BASE_PATH:-/}"

BACKEND_LOG="$ROOT_DIR/.meridian-backend-prod.log"
FRONTEND_LOG="$ROOT_DIR/.meridian-frontend-prod.log"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend directory not found: $BACKEND_DIR"
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

if [[ ! -x "$BACKEND_DIR/venv/bin/python" ]]; then
  echo "Python venv not found at $BACKEND_DIR/venv/bin/python"
  echo "Run these first:"
  echo "  cd $BACKEND_DIR"
  echo "  python -m venv venv"
  echo "  source venv/bin/activate"
  echo "  pip install -r requirements.txt"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required but not found in PATH"
  exit 1
fi

cleanup() {
  local code=$?
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
  wait >/dev/null 2>&1 || true
  exit "$code"
}

trap cleanup INT TERM EXIT

echo "Building frontend for production..."
(
  cd "$FRONTEND_DIR"
  npm_config_user_agent="pnpm/11.3.0" \
  NODE_ENV=production \
  PORT="$FRONTEND_PORT" \
  BASE_PATH="$BASE_PATH" \
  pnpm build
) >>"$FRONTEND_LOG" 2>&1

echo "Starting MERIDIAN production services..."

echo "- Backend API: http://localhost:${BACKEND_PORT}"
(
  cd "$BACKEND_DIR"
  "$BACKEND_DIR/venv/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT"
) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo "- Frontend preview: http://localhost:${FRONTEND_PORT}"
(
  cd "$FRONTEND_DIR"
  npm_config_user_agent="pnpm/11.3.0" \
  NODE_ENV=production \
  PORT="$FRONTEND_PORT" \
  BASE_PATH="$BASE_PATH" \
  VITE_API_BASE_URL="http://localhost:${BACKEND_PORT}" \
  VITE_API_PROXY_TARGET="http://localhost:${BACKEND_PORT}" \
  pnpm serve
) >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

sleep 1

if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
  echo "Backend failed to start. Check $BACKEND_LOG"
  exit 1
fi

if ! kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
  echo "Frontend failed to start. Check $FRONTEND_LOG"
  exit 1
fi

echo ""
echo "MERIDIAN production stack is running:"
echo "- Frontend: http://localhost:${FRONTEND_PORT}"
echo "- Backend:  http://localhost:${BACKEND_PORT}"
echo "- Health:   http://localhost:${BACKEND_PORT}/api/healthz"
echo ""
echo "Logs:"
echo "- $BACKEND_LOG"
echo "- $FRONTEND_LOG"
echo ""
echo "Press Ctrl+C to stop both services."

wait -n "$BACKEND_PID" "$FRONTEND_PID"

echo "A service exited. Stopping all..."
exit 1
