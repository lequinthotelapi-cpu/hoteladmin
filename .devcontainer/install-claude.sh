
#!/usr/bin/env bash
set -euo pipefail

# Instala el CLI de Claude si no está presente. Evita reinstalar si ya existe.
if command -v claude >/dev/null 2>&1; then
  echo "claude already installed"
  exit 0
fi

echo "Checking for curl..."
if ! command -v curl >/dev/null 2>&1; then
  echo "curl: not found. Attempting to install via apt-get..."
  if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y && apt-get install -y --no-install-recommends curl ca-certificates
  else
    echo "apt-get not available. Please install 'curl' manually inside the container and re-run this script."
    exit 1
  fi
fi

echo "Installing Claude CLI..."
# Nota: revisar el script remoto antes de ejecutar en entornos sensibles.
curl -fsSL https://claude.ai/install.sh | bash

echo "Claude CLI installation finished."

# Try to find the installed binary in common locations and expose it via /usr/local/bin
SEARCH_PATHS=("/root/.local/bin/claude" "$HOME/.local/bin/claude" "/usr/local/bin/claude" "/opt/claude/claude" "/usr/bin/claude")
FOUND=""
for p in "${SEARCH_PATHS[@]}"; do
  if [ -x "$p" ]; then
    FOUND="$p"
    break
  fi
done

if [ -n "$FOUND" ]; then
  echo "Found claude binary at: $FOUND"
  if [ ! -x "/usr/local/bin/claude" ]; then
    echo "Creating symlink /usr/local/bin/claude -> $FOUND"
    ln -sf "$FOUND" /usr/local/bin/claude || true
  fi
else
  echo "Could not find claude binary in common locations."
  echo "You can search manually: find / -name claude -type f 2>/dev/null"
fi

echo "Final PATH: $PATH"
