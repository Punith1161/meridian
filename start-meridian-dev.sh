#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_PACKAGE_DIR="$ROOT_DIR/Meridian-Code-Flow/artifacts/meridian"
FRONTEND_WORKSPACE_DIR="$ROOT_DIR/Meridian-Code-Flow"

BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
FRONTEND_BASE_PATH="${FRONTEND_BASE_PATH:-/}"

BACKEND_PID=""
FRONTEND_PID=""

PNPM_VERSION=""
NODE_VERSION=""

run_pnpm() {
  npm_config_user_agent="pnpm/${PNPM_VERSION} node/${NODE_VERSION}" pnpm "$@"
}

is_port_in_use() {
  local port="$1"
  ss -ltn "sport = :$port" 2>/dev/null | grep -q LISTEN
}

pick_frontend_port() {
  local start_port="$1"
  local port="$start_port"
  local attempts=25

  while [[ $attempts -gt 0 ]]; do
    if ! is_port_in_use "$port"; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
    attempts=$((attempts - 1))
  done

  return 1
}

cleanup() {
  echo ""
  echo "Stopping Meridian dev services..."

  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi

  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend directory not found: $BACKEND_DIR"
  exit 1
fi

if [[ ! -d "$FRONTEND_WORKSPACE_DIR" ]]; then
  echo "Frontend workspace directory not found: $FRONTEND_WORKSPACE_DIR"
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/venv/bin/activate" ]]; then
  echo "Python virtualenv missing at $BACKEND_DIR/venv"
  echo "Create it first:"
  echo "  cd $BACKEND_DIR"
  echo "  python3 -m venv venv"
  echo "  source venv/bin/activate"
  echo "  pip install -r requirements.txt"
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/.env" ]] && [[ -f "$BACKEND_DIR/.env.example" ]]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "Created backend .env from .env.example"
fi

if [[ ! -f "$FRONTEND_PACKAGE_DIR/.env" ]] && [[ -f "$FRONTEND_PACKAGE_DIR/.env.example" ]]; then
  cp "$FRONTEND_PACKAGE_DIR/.env.example" "$FRONTEND_PACKAGE_DIR/.env"
  echo "Created frontend .env from .env.example"
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    echo "pnpm not found. Trying to activate via corepack..."
    corepack enable
    corepack prepare pnpm@latest --activate
  fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not available. Install Node.js + corepack/pnpm first."
  exit 1
fi

PNPM_VERSION="$(pnpm --version)"
NODE_VERSION="$(node -v | sed 's/^v//')"

if ! FRONTEND_PORT="$(pick_frontend_port "$FRONTEND_PORT")"; then
  echo "Could not find a free frontend port after trying 25 ports."
  exit 1
fi

echo "Installing frontend dependencies with pnpm..."
(
  cd "$FRONTEND_WORKSPACE_DIR"
  run_pnpm approve-builds --all >/dev/null 2>&1 || true
  run_pnpm install
)

echo "Starting FastAPI backend on ${BACKEND_HOST}:${BACKEND_PORT}..."
(
  cd "$BACKEND_DIR"
  source venv/bin/activate
  export FRONTEND_URLS="http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}${FRONTEND_URLS:+,$FRONTEND_URLS}"
  uvicorn app.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" --reload
) &
BACKEND_PID=$!

echo "Starting frontend dev server..."
(
  cd "$FRONTEND_WORKSPACE_DIR"
  export PORT="$FRONTEND_PORT"
  export BASE_PATH="$FRONTEND_BASE_PATH"
  run_pnpm --filter @workspace/meridian dev
) &
FRONTEND_PID=$!

echo ""
echo "Services are running:"
echo "- Backend:  http://${BACKEND_HOST}:${BACKEND_PORT}/api/healthz"
echo "- Frontend: http://localhost:${FRONTEND_PORT}"
echo ""
echo "Press Ctrl+C to stop both services."

wait -n "$BACKEND_PID" "$FRONTEND_PID"

echo "One of the services exited. Shutting down the other..."
