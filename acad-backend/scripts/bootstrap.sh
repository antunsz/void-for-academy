#!/usr/bin/env bash
#
# Bootstrap script for the Acad AgentOS backend.
# Creates a virtual environment, installs dependencies, and starts the server.
#
# Usage:
#   ./scripts/bootstrap.sh [--port PORT] [--host HOST] [--skip-install]
#
# Called automatically by the Electron app on startup.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="${ACAD_VENV_DIR:-$BACKEND_DIR/.venv}"
PORT="${ACAD_PORT:-7777}"
HOST="${ACAD_HOST:-127.0.0.1}"
SKIP_INSTALL=false
PID_FILE="$BACKEND_DIR/.acad-backend.pid"

while [[ $# -gt 0 ]]; do
    case $1 in
        --port) PORT="$2"; shift 2 ;;
        --host) HOST="$2"; shift 2 ;;
        --skip-install) SKIP_INSTALL=true; shift ;;
        *) shift ;;
    esac
done

find_python() {
    for cmd in python3.12 python3.11 python3 python; do
        if command -v "$cmd" &>/dev/null; then
            local ver
            ver=$("$cmd" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0")
            local major="${ver%%.*}"
            local minor="${ver##*.}"
            if [[ "$major" -ge 3 ]] && [[ "$minor" -ge 11 ]]; then
                echo "$cmd"
                return 0
            fi
        fi
    done
    return 1
}

ensure_venv() {
    if [[ ! -d "$VENV_DIR" ]]; then
        local python_cmd
        python_cmd=$(find_python) || {
            echo "ERROR: Python 3.11+ is required but not found." >&2
            exit 1
        }
        echo "Creating virtual environment at $VENV_DIR using $python_cmd..."
        "$python_cmd" -m venv "$VENV_DIR"
    fi
}

install_deps() {
    if [[ "$SKIP_INSTALL" == "true" ]]; then
        return 0
    fi

    local marker="$VENV_DIR/.deps-installed"
    local pyproject="$BACKEND_DIR/pyproject.toml"

    if [[ -f "$marker" ]] && [[ "$marker" -nt "$pyproject" ]]; then
        return 0
    fi

    echo "Installing dependencies..."
    "$VENV_DIR/bin/pip" install --quiet --upgrade pip
    "$VENV_DIR/bin/pip" install --quiet -e "$BACKEND_DIR"
    touch "$marker"
}

start_server() {
    echo "Starting Acad AgentOS on $HOST:$PORT..."
    cd "$BACKEND_DIR"
    exec "$VENV_DIR/bin/python" -m uvicorn acad.main:app \
        --host "$HOST" \
        --port "$PORT" \
        --log-level info
}

cleanup_stale_pid() {
    if [[ -f "$PID_FILE" ]]; then
        local old_pid
        old_pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
            echo "Stopping stale backend process (PID $old_pid)..."
            kill "$old_pid" 2>/dev/null || true
            sleep 1
        fi
        rm -f "$PID_FILE"
    fi
}

main() {
    cleanup_stale_pid
    ensure_venv
    install_deps
    echo $$ > "$PID_FILE"
    trap 'rm -f "$PID_FILE"' EXIT
    start_server
}

main
