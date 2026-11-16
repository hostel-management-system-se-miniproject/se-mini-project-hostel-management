#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is required. Install k6 or run the script via Docker."
  exit 1
fi

k6 run "$(dirname "$0")/login-dashboard-load.js" \
  --env BASE_URL="$BASE_URL" \
  --env STUDENT_EMAIL="${STUDENT_EMAIL:-student@example.com}" \
  --env STUDENT_PASSWORD="${STUDENT_PASSWORD:-Password123!}" \
  --env ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}" \
  --env ADMIN_PASSWORD="${ADMIN_PASSWORD:-Password123!}"
