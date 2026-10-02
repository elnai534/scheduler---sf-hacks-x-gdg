#!/usr/bin/env bash
# Usage: scripts/set-secret.sh [VAR_NAME]   (default: VITE_GEMINI_API_KEY)
# Prompts for the value without echoing it and stores it in .env.local (gitignored, chmod 600).
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${1:-VITE_GEMINI_API_KEY}"
read -r -s -p "Paste value for ${NAME} (hidden): " VALUE; echo
[ -n "$VALUE" ] || { echo "Empty value, nothing saved."; exit 1; }
touch .env.local && chmod 600 .env.local
grep -v "^${NAME}=" .env.local > .env.local.tmp || true
printf '%s=%s\n' "$NAME" "$VALUE" >> .env.local.tmp
mv .env.local.tmp .env.local && chmod 600 .env.local
git check-ignore -q .env.local && echo "Saved ${NAME} to .env.local (gitignored). Restart the dev server to pick it up." || echo "WARNING: .env.local is NOT gitignored!"
