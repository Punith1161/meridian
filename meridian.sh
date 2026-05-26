
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/Meridian-Code-Flow/Meridian-Code-Flow/artifacts/meridian"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BASE_PATH="${BASE_PATH:-/}"

BACKEND_LOG="$ROOT_DIR/.meridian-backend.log"
FRONTEND_LOG="$ROOT_DIR/.meridian-frontend.log"

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

echo "Starting MERIDIAN services..."

echo "- Backend: http://localhost:${BACKEND_PORT}"
(
  cd "$BACKEND_DIR"
  # If port is in use, try to free it (best-effort)
  if command -v lsof >/dev/null 2>&1; then
    EXIST_PID=$(lsof -tiTCP:"$BACKEND_PORT" -sTCP:LISTEN || true)
    if [[ -n "${EXIST_PID:-}" ]]; then
      echo "[launcher] Port $BACKEND_PORT in use by PID $EXIST_PID — attempting to kill"
      kill "$EXIST_PID" >/dev/null 2>&1 || true
      sleep 1
    fi
  elif command -v fuser >/dev/null 2>&1; then
    if fuser "$BACKEND_PORT"/tcp >/dev/null 2>&1; then
      echo "[launcher] Port $BACKEND_PORT in use — attempting to fuser -k"
      fuser -k "$BACKEND_PORT"/tcp || true
      sleep 1
    fi
  fi
  "$BACKEND_DIR/venv/bin/python" -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo "- Frontend: http://localhost:${FRONTEND_PORT}"
(
  cd "$FRONTEND_DIR"
  npm_config_user_agent="pnpm/11.3.0" \
  PORT="$FRONTEND_PORT" \
  BASE_PATH="$BASE_PATH" \
  VITE_API_PROXY_TARGET="http://localhost:${BACKEND_PORT}" \
  bash -lc '
    set -euo pipefail
    echo "[launcher] Ensuring frontend dependencies are installed and build approvals accepted"
    export npm_config_user_agent="pnpm/11.3.0"
    # Run approve-builds at the workspace root so workspace-level native build approvals are accepted
    WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
    if [[ -d "$WORKSPACE_DIR" ]]; then
      echo "[launcher] Running pnpm approve-builds in workspace: $WORKSPACE_DIR"
      pushd "$WORKSPACE_DIR" >/dev/null || true
      pnpm install || true
      pnpm approve-builds --all || true
      pnpm install || true
      popd >/dev/null || true
    fi
    # Start the frontend dev server
    pnpm dev
  '
) >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

sleep 1

if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
  echo "Backend failed to start. Check $BACKEND_LOG"
  tail -n 60 "$BACKEND_LOG" || true
  exit 1
fi

if ! kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
  echo "Frontend failed to start. Check $FRONTEND_LOG"
  tail -n 60 "$FRONTEND_LOG" || true
  exit 1
fi

echo ""
echo "MERIDIAN is running:"
echo "- Frontend: http://localhost:${FRONTEND_PORT}"
echo "- Backend:  http://localhost:${BACKEND_PORT}"
echo "- Health:   http://localhost:${BACKEND_PORT}/api/healthz"
echo ""
echo "Logs:"
echo "- $BACKEND_LOG"
echo "- $FRONTEND_LOG"
echo ""
echo "Press Ctrl+C to stop both services."

set +e
wait -n "$BACKEND_PID" "$FRONTEND_PID"
EXITED_CODE=$?
set -e

echo "A service exited (code: $EXITED_CODE). Stopping all..."
if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
  echo "Recent backend logs:"
  tail -n 60 "$BACKEND_LOG" || true
fi
if ! kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
  echo "Recent frontend logs:"
  tail -n 60 "$FRONTEND_LOG" || true
fi
exit 1
