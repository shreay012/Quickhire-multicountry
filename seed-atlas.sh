#!/usr/bin/env bash
# QuickHire — seed Atlas database with sample services / users / etc.
# Run from anywhere; it cd's into the backend folder for you.
#
# Usage:
#   bash seed-atlas.sh
#
# What it does:
#   1. cd into "quickhire-AI-mode /backend" (the real backend dir)
#   2. Ensures node_modules is installed
#   3. Runs src/scripts/seed-all.js with Atlas + Upstash creds
#
# Idempotent — every record is upserted, safe to re-run.

set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_ROOT/quickhire-AI-mode /backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "❌ Backend directory not found at: $BACKEND_DIR"
  echo "   Run this script from the QHFixed repo root."
  exit 1
fi

cd "$BACKEND_DIR"

# Ensure deps are installed
if [ ! -d node_modules ]; then
  echo "📦 Installing backend dependencies..."
  npm install
fi

echo "🌱 Seeding Atlas database (this connects to MongoDB Atlas + Upstash Redis)..."
echo ""

MONGO_URI='mongodb+srv://shreaygoyalofficial_db_user:dh60mEDXnINtejBK@qh-ai-multi.akc0ws4.mongodb.net/quickhire?retryWrites=true&w=majority&appName=QH-AI-MULTI' \
MONGO_DB='quickhire' \
REDIS_URL='rediss://default:gQAAAAAAAbPxAAIgcDIzYzI3Yjc3NDJhYTM0NzNlOTYxZDlkNzdjODY5OWI0MA@fit-terrier-111601.upstash.io:6379' \
NODE_ENV='production' \
node src/scripts/seed-all.js

echo ""
echo "✅ Seed complete. Reload qhfixed.vercel.app to see services."
