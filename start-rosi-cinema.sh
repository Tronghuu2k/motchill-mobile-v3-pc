#!/data/data/com.termux/files/usr/bin/bash
set -e
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_SRC="$BASE_DIR/client/src"
PORT="${1:-8080}"

if ! command -v python3 >/dev/null 2>&1; then
  pkg update -y && pkg install -y python
fi

echo "http://127.0.0.1:$PORT"
exec python3 -m http.server "$PORT" -d "$APP_SRC"
