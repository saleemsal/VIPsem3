#!/usr/bin/env bash
set -euo pipefail

# Load .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env | sed 's/^export //')
fi

# Force Gemini for the demo unless explicitly overridden
export LLM_PROVIDER=${LLM_PROVIDER:-gemini}

# Optional defaults for Ollama (ignored when LLM_PROVIDER=gemini)
export OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://127.0.0.1:11434}
export OLLAMA_MODEL=${OLLAMA_MODEL:-llama3.1:8b}

exec npx tsx scripts/local-api.ts
