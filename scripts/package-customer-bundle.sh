#!/usr/bin/env bash
set -euo pipefail

DIST_DIR="./bundles"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT="$DIST_DIR/ecosyntech-backend-bundle-$TIMESTAMP.tar.gz"

echo "[Bundle] Preparing customer deployment bundle..."
mkdir -p "$DIST_DIR"

# Ensure tar exists
if ! command -v tar >/dev/null 2>&1; then
  echo "Error: tar command not found. Please install tar to proceed." >&2
  exit 1
fi

# Build bundle excluding heavy/dev/test artifacts
EXCLUDES=(
  --exclude='./node_modules'
  --exclude='./dist'
  --exclude='./logs'
  --exclude='./data'
  --exclude='./__tests__'
  --exclude='./.git'
  --exclude='./.github'
)

tar czf "$OUTPUT" . "${EXCLUDES[@]}" --transform 's|^|ecosyntech-backend/|S'

echo "[Bundle] Created: $OUTPUT"
echo "You can distribute this tarball to customer machines. They can extract and run: 'docker-compose up -d' or 'npm install' then 'npm start' depending on deployment choice."
