#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
BACKEND_PORT=8001
FRONTEND_PORT=5173

# Resolve script directory regardless of where it is invoked from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="${SCRIPT_DIR}/logs"
VENV_DIR="${SCRIPT_DIR}/backend/.venv"

# -----------------------------------------------------------------------------
# Options
# -----------------------------------------------------------------------------
RESET_DB=false
OPEN_BROWSER=false
AUTO_SETUP=false
PROD_MODE=false

show_help() {
    cat <<EOF
Usage: ./run.sh [OPTIONS]

One-command launcher for TrojanGuard SOC & Threat Intelligence Workbench.

Options:
  --reset-db   Delete backend/trojanguard.db before starting (history starts clean)
  --open       Open http://localhost:${FRONTEND_PORT} in the default browser upon startup
  --setup      Automatically create backend/.venv and install dependencies if missing
  --prod       Build frontend and serve with 'npm run preview' instead of dev server
  --help, -h   Show this help message and exit

Default URLs:
  Frontend:    http://localhost:${FRONTEND_PORT}
  API Docs:    http://localhost:${BACKEND_PORT}/docs
  Health:      http://localhost:${BACKEND_PORT}/api/health
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --reset-db)
            RESET_DB=true
            shift
            ;;
        --open)
            OPEN_BROWSER=true
            shift
            ;;
        --setup)
            AUTO_SETUP=true
            shift
            ;;
        --prod)
            PROD_MODE=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "Error: Unknown argument '$1'." >&2
            echo "Run './run.sh --help' for available options." >&2
            exit 1
            ;;
    esac
done

# -----------------------------------------------------------------------------
# Pre-flight Checks
# -----------------------------------------------------------------------------

# 1. Check Python virtual environment (backend/.venv)
if [ ! -d "$VENV_DIR" ] || [ ! -x "$VENV_DIR/bin/uvicorn" ]; then
    echo "Error: backend/.venv not found or incomplete." >&2
    echo "" >&2
    echo "Setup commands from README:" >&2
    echo "  cd backend && uv venv --python 3.12 .venv && uv pip install -r requirements.txt" >&2
    echo "" >&2
    if [ "$AUTO_SETUP" = true ]; then
        echo "[setup] Running setup automatically (--setup flag detected)..."
        (cd "${SCRIPT_DIR}/backend" && uv venv --python 3.12 .venv && uv pip install -r requirements.txt)
    elif [ -t 0 ]; then
        read -r -p "Would you like to run setup now? [y/N] " response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            (cd "${SCRIPT_DIR}/backend" && uv venv --python 3.12 .venv && uv pip install -r requirements.txt)
        else
            echo "Aborted. Please run setup manually or launch with --setup." >&2
            exit 1
        fi
    else
        echo "Launch with '--setup' to configure the virtual environment automatically." >&2
        exit 1
    fi
fi

# 2. Check Node.js and npm
if ! command -v node >/dev/null 2>&1; then
    echo "Error: 'node' is not installed or not in PATH." >&2
    exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
    echo "Error: 'npm' is not installed or not in PATH." >&2
    exit 1
fi

# 3. Check frontend/node_modules (auto-install if missing)
if [ ! -d "${SCRIPT_DIR}/frontend/node_modules" ]; then
    echo "[setup] frontend/node_modules missing. Running 'npm install'..."
    (cd "${SCRIPT_DIR}/frontend" && npm install)
fi

# 4. Check that neither port is already in use
check_port() {
    local port="$1"
    local name="$2"
    local ss_out
    ss_out=$(ss -ltnp "sport = :$port" 2>/dev/null || ss -ltn "sport = :$port" 2>/dev/null)
    if echo "$ss_out" | grep -q "LISTEN"; then
        echo "Error: $name port $port is already in use." >&2
        echo "Active process occupying port $port:" >&2
        echo "$ss_out" >&2
        exit 1
    fi
}

check_port "$BACKEND_PORT" "Backend"
check_port "$FRONTEND_PORT" "Frontend"

# -----------------------------------------------------------------------------
# Database Reset (optional)
# -----------------------------------------------------------------------------
if [ "$RESET_DB" = true ]; then
    echo "[database] Resetting SQLite database (--reset-db)..."
    rm -f "${SCRIPT_DIR}/backend/trojanguard.db"*
    echo "[database] Deleted backend/trojanguard.db (database will initialize clean on startup)."
fi

# -----------------------------------------------------------------------------
# Process Management & Traps
# -----------------------------------------------------------------------------
mkdir -p "$LOGS_DIR"

BACKEND_PID=""
FRONTEND_PID=""
STARTED=false

cleanup() {
    trap - INT TERM EXIT
    if [ "$STARTED" = false ]; then
        exit 0
    fi
    echo ""
    echo "[shutdown] Stopping TrojanGuard processes..."

    if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill -TERM -- -"$BACKEND_PID" 2>/dev/null || kill -TERM "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill -TERM -- -"$FRONTEND_PID" 2>/dev/null || kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    fi

    # Allow up to 2 seconds for graceful exit
    for _ in $(seq 1 10); do
        local b_alive=0 f_alive=0
        if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then b_alive=1; fi
        if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then f_alive=1; fi
        if [ "$b_alive" -eq 0 ] && [ "$f_alive" -eq 0 ]; then
            break
        fi
        sleep 0.2
    done

    # Force kill any lingering processes in the process groups
    if [ -n "${BACKEND_PID:-}" ]; then
        kill -KILL -- -"$BACKEND_PID" 2>/dev/null || kill -KILL "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "${FRONTEND_PID:-}" ]; then
        kill -KILL -- -"$FRONTEND_PID" 2>/dev/null || kill -KILL "$FRONTEND_PID" 2>/dev/null || true
    fi

    # Verify ports are released
    local p_backend p_frontend
    p_backend=$(ss -ltn "sport = :$BACKEND_PORT" 2>/dev/null | grep -c "LISTEN" || true)
    p_frontend=$(ss -ltn "sport = :$FRONTEND_PORT" 2>/dev/null | grep -c "LISTEN" || true)
    if [ "$p_backend" -eq 0 ] && [ "$p_frontend" -eq 0 ]; then
        echo "[shutdown] Clean shutdown complete. Ports $BACKEND_PORT and $FRONTEND_PORT are free."
    else
        echo "[shutdown] Note: Sockets on ports $BACKEND_PORT and $FRONTEND_PORT are closing."
    fi

    exit 0
}

trap cleanup INT TERM EXIT

# -----------------------------------------------------------------------------
# Launch Services
# -----------------------------------------------------------------------------
echo "[startup] Starting backend server on port ${BACKEND_PORT}..."
setsid bash -c "cd '${SCRIPT_DIR}/backend' && export PYTHONPATH='${SCRIPT_DIR}/backend' && exec '${VENV_DIR}/bin/uvicorn' app.main:app --host 127.0.0.1 --port '${BACKEND_PORT}'" > "$LOGS_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

if [ "$PROD_MODE" = true ]; then
    echo "[startup] Building frontend bundle ('npm run build')..."
    (cd "${SCRIPT_DIR}/frontend" && npm run build) >> "$LOGS_DIR/frontend.log" 2>&1
    echo "[startup] Starting frontend preview server on port ${FRONTEND_PORT}..."
    setsid bash -c "cd '${SCRIPT_DIR}/frontend' && exec npm run preview -- --port '${FRONTEND_PORT}' --host 127.0.0.1" > "$LOGS_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
else
    echo "[startup] Starting frontend dev server on port ${FRONTEND_PORT}..."
    setsid bash -c "cd '${SCRIPT_DIR}/frontend' && exec npm run dev -- --port '${FRONTEND_PORT}' --host 127.0.0.1" > "$LOGS_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
fi

STARTED=true

# -----------------------------------------------------------------------------
# Health Check Polling
# -----------------------------------------------------------------------------
echo "[startup] Polling backend health endpoint (http://localhost:${BACKEND_PORT}/api/health)..."
HEALTHY=false
for _ in $(seq 1 40); do
    if curl -sf "http://localhost:${BACKEND_PORT}/api/health" >/dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    # Also verify backend process has not crashed early
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        break
    fi
    sleep 0.5
done

if [ "$HEALTHY" != true ]; then
    echo "Error: Backend failed to respond at http://localhost:${BACKEND_PORT}/api/health within 20 seconds." >&2
    echo "" >&2
    echo "Last 20 lines of logs/backend.log:" >&2
    echo "----------------------------------------" >&2
    if [ -f "$LOGS_DIR/backend.log" ]; then
        tail -n 20 "$LOGS_DIR/backend.log" >&2
    else
        echo "(logs/backend.log not found)" >&2
    fi
    echo "----------------------------------------" >&2
    exit 1
fi

# -----------------------------------------------------------------------------
# Summary & Foreground Wait
# -----------------------------------------------------------------------------
echo ""
echo "============================================================"
echo " TrojanGuard — AI-Powered Threat Analysis & SOC Workbench"
echo "============================================================"
echo "  • Web Interface:     http://localhost:${FRONTEND_PORT}"
echo "  • API Documentation: http://localhost:${BACKEND_PORT}/docs"
echo "  • Health Endpoint:   http://localhost:${BACKEND_PORT}/api/health"
echo "  • Backend Log:       logs/backend.log"
echo "  • Frontend Log:      logs/frontend.log"
echo "============================================================"
echo "  Ready. Press Ctrl+C to stop all services."
echo "============================================================"
echo ""

if [ "$OPEN_BROWSER" = true ]; then
    if command -v xdg-open >/dev/null 2>&1; then
        echo "[browser] Opening http://localhost:${FRONTEND_PORT} in default browser..."
        xdg-open "http://localhost:${FRONTEND_PORT}" >/dev/null 2>&1 &
    else
        echo "[browser] Note: 'xdg-open' not found; open http://localhost:${FRONTEND_PORT} manually."
    fi
fi

# Keep script in foreground; Ctrl+C will trigger cleanup trap
wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
