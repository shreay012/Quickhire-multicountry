#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  QuickHire — Start Everything
#  Usage:  ./start.sh
# ─────────────────────────────────────────────────────────────

set -e
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/quickhire-AI-mode /backend"
FRONTEND="$ROOT/frontend"

echo ""
echo -e "${BOLD}${CYAN}🚀 QuickHire — Starting all services...${NC}"
echo "────────────────────────────────────────"

# ── 1. MongoDB ────────────────────────────────────────────────
echo -e "\n${YELLOW}▶ Starting MongoDB...${NC}"
if brew services start mongodb-community 2>/dev/null; then
  echo -e "${GREEN}✅ MongoDB started${NC}"
else
  # Try alternate service names
  brew services start mongodb-community@7.0 2>/dev/null || \
  brew services start mongodb-community@6.0 2>/dev/null || \
  echo -e "${YELLOW}⚠️  MongoDB may already be running or not installed via Homebrew${NC}"
fi
sleep 1

# ── 2. Redis ──────────────────────────────────────────────────
echo -e "\n${YELLOW}▶ Starting Redis...${NC}"
if brew services start redis 2>/dev/null; then
  echo -e "${GREEN}✅ Redis started${NC}"
else
  echo -e "${YELLOW}⚠️  Redis may already be running${NC}"
fi
sleep 1

# ── 3. Health check ───────────────────────────────────────────
echo -e "\n${YELLOW}▶ Checking services...${NC}"

# MongoDB
if mongosh --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null | grep -q "ok"; then
  echo -e "${GREEN}✅ MongoDB  → Connected${NC}"
else
  echo -e "${YELLOW}⚠️  MongoDB  → Not responding yet (backend has fallback)${NC}"
fi

# Redis
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
  echo -e "${GREEN}✅ Redis    → Connected${NC}"
else
  echo -e "${YELLOW}⚠️  Redis    → Not responding yet (backend has fallback)${NC}"
fi

# ── 4. Backend ────────────────────────────────────────────────
echo -e "\n${YELLOW}▶ Starting Backend (port 4000)...${NC}"
cd "$BACKEND"

# Kill anything already on port 4000
lsof -ti :4000 | xargs kill -9 2>/dev/null || true
sleep 0.5

# Start backend in new Terminal tab
osascript -e "
tell application \"Terminal\"
  activate
  do script \"cd '$BACKEND' && npm run dev\"
end tell
" 2>/dev/null || {
  # Fallback: run in background with log file
  nohup npm run dev > "$ROOT/backend.log" 2>&1 &
  echo "  (running in background — logs: $ROOT/backend.log)"
}
echo -e "${GREEN}✅ Backend  → Starting on http://localhost:4000${NC}"
sleep 2

# ── 5. Frontend ───────────────────────────────────────────────
echo -e "\n${YELLOW}▶ Starting Frontend (port 3000)...${NC}"
cd "$FRONTEND"

# Kill anything already on port 3000
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
sleep 0.5

# Start frontend in new Terminal tab
osascript -e "
tell application \"Terminal\"
  activate
  do script \"cd '$FRONTEND' && npm run dev\"
end tell
" 2>/dev/null || {
  nohup npm run dev > "$ROOT/frontend.log" 2>&1 &
  echo "  (running in background — logs: $ROOT/frontend.log)"
}
echo -e "${GREEN}✅ Frontend → Starting on http://localhost:3000${NC}"

# ── 6. Done ───────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────"
echo -e "${BOLD}${GREEN}✅ All services launched!${NC}"
echo ""
echo -e "  ${CYAN}Frontend  →${NC} http://localhost:3000"
echo -e "  ${CYAN}Backend   →${NC} http://localhost:4000"
echo -e "  ${CYAN}MongoDB   →${NC} mongodb://localhost:27017"
echo -e "  ${CYAN}Redis     →${NC} redis://localhost:6379"
echo ""
echo -e "${YELLOW}💡 OTP for demo: 1234 (any mobile number)${NC}"
echo "────────────────────────────────────────"
echo ""
