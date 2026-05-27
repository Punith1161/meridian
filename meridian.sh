#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend/frontend/artifacts/meridian"
FRONTEND_VITE="$FRONTEND_DIR/node_modules/.bin/vite"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BASE_PATH="${BASE_PATH:-/}"
VITE_API_PROXY_TARGET="${VITE_API_PROXY_TARGET:-http://127.0.0.1:${BACKEND_PORT}}"
BACKEND_UVICORN="$BACKEND_DIR/venv/bin/uvicorn"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend directory not found: $BACKEND_DIR" >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend directory not found: $FRONTEND_DIR" >&2
  exit 1
fi

if [[ ! -x "$FRONTEND_VITE" ]]; then
  echo "Frontend Vite binary not found: $FRONTEND_VITE" >&2
  exit 1
fi

if command -v fuser >/dev/null 2>&1; then
  fuser -k "${BACKEND_PORT}/tcp" >/dev/null 2>&1 || true
  fuser -k "${FRONTEND_PORT}/tcp" >/dev/null 2>&1 || true
fi

stop_process_group() {
  local pid="$1"
  if [[ -z "$pid" ]]; then
    return
  fi
  if kill -0 "$pid" 2>/dev/null; then
    kill -- -"$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  stop_process_group "${BACKEND_PID:-}"
  stop_process_group "${FRONTEND_PID:-}"
}

trap cleanup EXIT INT TERM

echo "Starting backend on http://127.0.0.1:${BACKEND_PORT}"
setsid bash -c "cd \"$BACKEND_DIR\" && if [[ -x \"$BACKEND_UVICORN\" ]]; then BACKEND_PORT=\"$BACKEND_PORT\" \"$BACKEND_UVICORN\" app.main:app --reload --host 0.0.0.0 --port \"$BACKEND_PORT\"; else echo \"Backend uvicorn not found at $BACKEND_UVICORN\" >&2; exit 1; fi" &
BACKEND_PID=$!

echo "Starting frontend on http://127.0.0.1:${FRONTEND_PORT}"
setsid bash -c "cd \"$FRONTEND_DIR\" && PORT=\"$FRONTEND_PORT\" BASE_PATH=\"$BASE_PATH\" VITE_API_PROXY_TARGET=\"$VITE_API_PROXY_TARGET\" \"$FRONTEND_VITE\" --config vite.config.ts --host 0.0.0.0" &
FRONTEND_PID=$!

wait -n "$BACKEND_PID" "$FRONTEND_PID"