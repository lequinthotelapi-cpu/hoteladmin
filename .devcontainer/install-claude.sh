#!/usr/bin/env bash
set -euo pipefail

# Instala el CLI de Claude si no está presente. Evita reinstalar si ya existe.
if command -v claude >/dev/null 2>&1; then
  echo "claude already installed"
  exit 0
fi

echo "Installing Claude CLI..."
# Nota: revisar el script remoto antes de ejecutar en entornos sensibles.
curl -fsSL https://claude.ai/install.sh | bash

echo "Claude CLI installation finished."
